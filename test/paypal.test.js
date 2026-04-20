/**
 * PayPalClient unit tests.
 *
 * Mocks `fetch` globally so we can test the client without hitting
 * the real PayPal API.
 *
 * Run with: npm test
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PayPalClient } from "../src/client.js";

let originalFetch;
let calls;

beforeEach(() => {
  originalFetch = global.fetch;
  calls = [];
});

afterEach(() => {
  global.fetch = originalFetch;
});

function mockFetch(responses) {
  let index = 0;
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    const response = responses[index++];
    if (!response) {
      throw new Error(`Unexpected fetch call ${index}: ${url}`);
    }
    const status = response.status ?? 200;
    const ok = status >= 200 && status < 300;
    const bodyStr =
      typeof response.body === "string"
        ? response.body
        : JSON.stringify(response.body ?? {});
    return {
      ok,
      status,
      headers: { get: () => null },
      text: async () => bodyStr,
      json: async () =>
        typeof response.body === "string"
          ? JSON.parse(response.body)
          : (response.body ?? {}),
    };
  };
}

/** First call is always OAuth token, second is the API call. */
function mockApi(apiResponse) {
  return [
    { body: { access_token: "tok_test", expires_in: 3600 } },
    apiResponse,
  ];
}

function makeClient() {
  return new PayPalClient({
    clientId: "test-id",
    clientSecret: "test-secret",
    baseUrl: "https://api-m.sandbox.paypal.com",
  });
}

// ── fetchWithRetry internals ──────────────────────────────────────────

describe("PayPalClient: fetchWithRetry edge cases", () => {
  it("retries on AbortError then succeeds", async () => {
    let attempt = 0;
    global.fetch = async (url, opts) => {
      calls.push({ url, options: opts });
      attempt++;
      if (attempt <= 2) {
        // First two: OAuth token + timeout on API call
        if (attempt === 1) {
          return {
            ok: true,
            status: 200,
            headers: { get: () => null },
            text: async () =>
              JSON.stringify({ access_token: "tok", expires_in: 3600 }),
            json: async () => ({ access_token: "tok", expires_in: 3600 }),
          };
        }
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }
      // Third call succeeds
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify({ id: "ORD-1" }),
        json: async () => ({ id: "ORD-1" }),
      };
    };
    const c = makeClient();
    const r = await c.getOrder("ORD-1");
    assert.equal(r.id, "ORD-1");
  });

  it("uses retry-after header when present on 429", async () => {
    mockFetch([
      { body: { access_token: "tok", expires_in: 3600 } },
      {
        status: 429,
        body: "Rate limited",
        retryAfter: "1",
      },
      { body: { id: "ORD-1" } },
    ]);
    // Override mockFetch to support retryAfter header
    const origFetch = global.fetch;
    const wrappedFetch = async (url, opts) => {
      const res = await origFetch(url, opts);
      // The second call (index 1) should have retry-after
      if (res.status === 429) {
        return {
          ...res,
          headers: { get: (h) => (h === "retry-after" ? "1" : null) },
        };
      }
      return res;
    };
    global.fetch = wrappedFetch;
    const c = makeClient();
    const r = await c.getOrder("ORD-1");
    assert.equal(r.id, "ORD-1");
  });
});

// ── Construction ───────────────────────────────────────────────────────

describe("PayPalClient: construction", () => {
  it("requires clientId", () => {
    assert.throws(
      () => new PayPalClient({ clientSecret: "s" }),
      /Client ID is required/,
    );
  });

  it("requires clientSecret", () => {
    assert.throws(
      () => new PayPalClient({ clientId: "id" }),
      /Client Secret is required/,
    );
  });

  it("strips trailing slash from baseUrl", () => {
    const c = new PayPalClient({
      clientId: "id",
      clientSecret: "s",
      baseUrl: "https://api.paypal.com/",
    });
    assert.equal(c.baseUrl, "https://api.paypal.com");
  });

  it("uses default base URL when none provided", () => {
    const c = new PayPalClient({ clientId: "id", clientSecret: "s" });
    assert.equal(c.baseUrl, "https://api-m.paypal.com");
  });
});

// ── OAuth ──────────────────────────────────────────────────────────────

describe("PayPalClient: OAuth", () => {
  it("sends Basic auth with base64 credentials", async () => {
    mockFetch(mockApi({ body: { id: "ORD-1" } }));
    const c = makeClient();
    await c.getOrder("ORD-1");
    const authHeader = calls[0].options.headers.Authorization;
    const decoded = Buffer.from(
      authHeader.replace("Basic ", ""),
      "base64",
    ).toString();
    assert.equal(decoded, "test-id:test-secret");
  });

  it("caches token across calls", async () => {
    mockFetch([
      { body: { access_token: "tok_cached", expires_in: 3600 } },
      { body: { id: "ORD-1" } },
      { body: { id: "ORD-2" } },
    ]);
    const c = makeClient();
    await c.getOrder("ORD-1");
    await c.getOrder("ORD-2");
    // Only 1 OAuth call + 2 API calls = 3 total
    assert.equal(calls.length, 3);
    assert.match(calls[0].url, /oauth2\/token/);
    assert.match(calls[1].url, /orders\/ORD-1/);
    assert.match(calls[2].url, /orders\/ORD-2/);
  });

  it("throws on OAuth failure", async () => {
    mockFetch([{ status: 401, body: "Unauthorized" }]);
    const c = makeClient();
    await assert.rejects(
      () => c.getOrder("x"),
      (err) => err.code === "OAUTH_FAILED",
    );
  });
});

// ── Orders ─────────────────────────────────────────────────────────────

describe("PayPalClient: orders", () => {
  it("createOrder posts to /v2/checkout/orders", async () => {
    mockFetch(mockApi({ body: { id: "ORD-1", status: "CREATED" } }));
    const c = makeClient();
    const r = await c.createOrder({ intent: "CAPTURE" });
    assert.equal(r.id, "ORD-1");
    assert.match(calls[1].url, /\/v2\/checkout\/orders$/);
    assert.equal(calls[1].options.method, "POST");
  });

  it("getOrder fetches by ID", async () => {
    mockFetch(mockApi({ body: { id: "ORD-1" } }));
    const c = makeClient();
    await c.getOrder("ORD-1");
    assert.match(calls[1].url, /\/v2\/checkout\/orders\/ORD-1$/);
    assert.equal(calls[1].options.method, "GET");
  });

  it("updateOrder sends PATCH", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.updateOrder("ORD-1", [
      { op: "replace", path: "/intent", value: "AUTHORIZE" },
    ]);
    assert.deepEqual(r, { success: true });
    assert.equal(calls[1].options.method, "PATCH");
  });

  it("captureOrder posts to capture endpoint", async () => {
    mockFetch(mockApi({ body: { id: "ORD-1", status: "COMPLETED" } }));
    const c = makeClient();
    await c.captureOrder("ORD-1");
    assert.match(calls[1].url, /\/ORD-1\/capture$/);
  });

  it("trackOrder posts tracking info", async () => {
    mockFetch(mockApi({ body: { id: "ORD-1" } }));
    const c = makeClient();
    await c.trackOrder("ORD-1", { tracking_number: "123" });
    assert.match(calls[1].url, /\/ORD-1\/track$/);
  });
});

// ── Payments ───────────────────────────────────────────────────────────

describe("PayPalClient: payments", () => {
  it("getAuthorization fetches by ID", async () => {
    mockFetch(mockApi({ body: { id: "AUTH-1" } }));
    const c = makeClient();
    await c.getAuthorization("AUTH-1");
    assert.match(calls[1].url, /\/v2\/payments\/authorizations\/AUTH-1$/);
  });

  it("captureAuthorization posts to capture", async () => {
    mockFetch(mockApi({ body: { id: "CAP-1" } }));
    const c = makeClient();
    await c.captureAuthorization("AUTH-1");
    assert.match(calls[1].url, /\/AUTH-1\/capture$/);
  });

  it("voidAuthorization posts to void", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.voidAuthorization("AUTH-1");
    assert.match(calls[1].url, /\/AUTH-1\/void$/);
  });

  it("refundCapture posts to refund", async () => {
    mockFetch(mockApi({ body: { id: "REF-1" } }));
    const c = makeClient();
    await c.refundCapture("CAP-1", { amount: { value: "10.00" } });
    assert.match(calls[1].url, /\/captures\/CAP-1\/refund$/);
  });

  it("getRefund fetches by ID", async () => {
    mockFetch(mockApi({ body: { id: "REF-1" } }));
    const c = makeClient();
    await c.getRefund("REF-1");
    assert.match(calls[1].url, /\/refunds\/REF-1$/);
  });
});

// ── Payouts ────────────────────────────────────────────────────────────

describe("PayPalClient: payouts", () => {
  it("createPayout posts batch", async () => {
    mockFetch(mockApi({ body: { batch_header: { payout_batch_id: "PB-1" } } }));
    const c = makeClient();
    await c.createPayout({ sender_batch_header: {}, items: [] });
    assert.match(calls[1].url, /\/v1\/payments\/payouts$/);
  });

  it("cancelPayoutItem posts cancel", async () => {
    mockFetch(mockApi({ body: { payout_item_id: "PI-1" } }));
    const c = makeClient();
    await c.cancelPayoutItem("PI-1");
    assert.match(calls[1].url, /\/payouts-item\/PI-1\/cancel$/);
  });
});

// ── Subscriptions ──────────────────────────────────────────────────────

describe("PayPalClient: subscriptions", () => {
  it("createSubscription posts to billing API", async () => {
    mockFetch(mockApi({ body: { id: "SUB-1", status: "APPROVAL_PENDING" } }));
    const c = makeClient();
    const r = await c.createSubscription({ plan_id: "P-1" });
    assert.equal(r.id, "SUB-1");
    assert.match(calls[1].url, /\/v1\/billing\/subscriptions$/);
  });

  it("suspendSubscription posts with reason", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.suspendSubscription("SUB-1");
    assert.match(calls[1].url, /\/SUB-1\/suspend$/);
    const body = JSON.parse(calls[1].options.body);
    assert.ok(body.reason);
  });

  it("cancelSubscription posts with reason", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.cancelSubscription("SUB-1");
    assert.match(calls[1].url, /\/SUB-1\/cancel$/);
  });

  it("listSubscriptionTransactions passes query params", async () => {
    mockFetch(mockApi({ body: { transactions: [] } }));
    const c = makeClient();
    await c.listSubscriptionTransactions("SUB-1", {
      start_time: "2024-01-01",
    });
    assert.match(calls[1].url, /start_time=2024-01-01/);
  });
});

// ── Invoicing ──────────────────────────────────────────────────────────

describe("PayPalClient: invoicing", () => {
  it("createInvoice follows HATEOAS href to return full invoice", async () => {
    mockFetch([
      { body: { access_token: "tok_test", expires_in: 3600 } },
      {
        body: {
          href: "https://api-m.sandbox.paypal.com/v2/invoicing/invoices/INV-1",
          rel: "self",
          method: "GET",
        },
      },
      {
        body: {
          id: "INV-1",
          status: "DRAFT",
          detail: { invoice_number: "0001" },
        },
      },
    ]);
    const c = makeClient();
    const r = await c.createInvoice({ detail: {} });
    // Should have made 3 calls: OAuth, POST create, GET self href
    assert.equal(calls.length, 3);
    assert.match(calls[1].url, /\/v2\/invoicing\/invoices$/);
    assert.equal(calls[1].options.method, "POST");
    assert.match(calls[2].url, /\/v2\/invoicing\/invoices\/INV-1$/);
    assert.equal(calls[2].options.method, "GET");
    // Returns the full invoice, not the href object
    assert.equal(r.id, "INV-1");
    assert.equal(r.status, "DRAFT");
  });

  it("createInvoice returns response as-is when no href", async () => {
    mockFetch(mockApi({ body: { id: "INV-2", status: "DRAFT" } }));
    const c = makeClient();
    const r = await c.createInvoice({ detail: {} });
    assert.equal(r.id, "INV-2");
    assert.equal(calls.length, 2);
  });

  it("sendInvoice posts to send endpoint", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.sendInvoice("INV-1");
    assert.match(calls[1].url, /\/INV-1\/send$/);
  });

  it("deleteInvoicePayment deletes by IDs", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.deleteInvoicePayment("INV-1", "PAY-1");
    assert.match(calls[1].url, /\/INV-1\/payments\/PAY-1$/);
    assert.equal(calls[1].options.method, "DELETE");
  });

  it("deleteInvoiceRefund deletes by IDs", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.deleteInvoiceRefund("INV-1", "REF-1");
    assert.match(calls[1].url, /\/INV-1\/refunds\/REF-1$/);
    assert.equal(calls[1].options.method, "DELETE");
  });

  it("generateInvoiceNumber posts with empty body", async () => {
    mockFetch(mockApi({ body: { invoice_number: "0042" } }));
    const c = makeClient();
    const r = await c.generateInvoiceNumber();
    assert.equal(r.invoice_number, "0042");
  });

  it("searchInvoices posts search body", async () => {
    mockFetch(mockApi({ body: { items: [] } }));
    const c = makeClient();
    await c.searchInvoices({ status: ["SENT"] });
    assert.match(calls[1].url, /\/search-invoices$/);
    assert.equal(calls[1].options.method, "POST");
  });
});

// ── Disputes ───────────────────────────────────────────────────────────

describe("PayPalClient: disputes", () => {
  it("listDisputes with query params", async () => {
    mockFetch(mockApi({ body: { items: [] } }));
    const c = makeClient();
    await c.listDisputes({ dispute_state: "OPEN" });
    assert.match(calls[1].url, /dispute_state=OPEN/);
  });

  it("provideDisputeEvidence posts evidence", async () => {
    mockFetch(mockApi({ body: { links: [] } }));
    const c = makeClient();
    await c.provideDisputeEvidence("DIS-1", { evidence_type: "PROOF" });
    assert.match(calls[1].url, /\/DIS-1\/provide-evidence$/);
  });

  it("makeDisputeOffer posts offer", async () => {
    mockFetch(mockApi({ body: {} }));
    const c = makeClient();
    await c.makeDisputeOffer("DIS-1", {
      offer_amount: { value: "50.00", currency_code: "USD" },
    });
    assert.match(calls[1].url, /\/DIS-1\/make-offer$/);
  });
});

// ── Vault ──────────────────────────────────────────────────────────────

describe("PayPalClient: vault", () => {
  it("createSetupToken posts to vault v3", async () => {
    mockFetch(mockApi({ body: { id: "ST-1" } }));
    const c = makeClient();
    await c.createSetupToken({ payment_source: {} });
    assert.match(calls[1].url, /\/v3\/vault\/setup-tokens$/);
  });

  it("deletePaymentToken sends DELETE", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.deletePaymentToken("PT-1");
    assert.match(calls[1].url, /\/payment-tokens\/PT-1$/);
    assert.equal(calls[1].options.method, "DELETE");
  });
});

// ── Products ───────────────────────────────────────────────────────────

describe("PayPalClient: products", () => {
  it("createProduct posts to catalogs API", async () => {
    mockFetch(mockApi({ body: { id: "PROD-1" } }));
    const c = makeClient();
    await c.createProduct({ name: "Widget", type: "DIGITAL" });
    assert.match(calls[1].url, /\/v1\/catalogs\/products$/);
  });

  it("listProducts passes pagination query", async () => {
    mockFetch(mockApi({ body: { products: [] } }));
    const c = makeClient();
    await c.listProducts({ page_size: "5" });
    assert.match(calls[1].url, /page_size=5/);
  });
});

// ── Webhooks ───────────────────────────────────────────────────────────

describe("PayPalClient: webhooks", () => {
  it("createWebhook posts to notifications API", async () => {
    mockFetch(mockApi({ body: { id: "WH-1" } }));
    const c = makeClient();
    await c.createWebhook({ url: "https://example.com", event_types: [] });
    assert.match(calls[1].url, /\/v1\/notifications\/webhooks$/);
  });

  it("deleteWebhook sends DELETE", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.deleteWebhook("WH-1");
    assert.equal(calls[1].options.method, "DELETE");
  });

  it("verifyWebhookSignature posts verification body", async () => {
    mockFetch(mockApi({ body: { verification_status: "SUCCESS" } }));
    const c = makeClient();
    const r = await c.verifyWebhookSignature({ webhook_id: "WH-1" });
    assert.equal(r.verification_status, "SUCCESS");
    assert.match(calls[1].url, /\/verify-webhook-signature$/);
  });
});

// ── Reporting ──────────────────────────────────────────────────────────

describe("PayPalClient: reporting", () => {
  it("searchTransactions passes query params", async () => {
    mockFetch(mockApi({ body: { transaction_details: [] } }));
    const c = makeClient();
    await c.searchTransactions({ start_date: "2024-01-01" });
    assert.match(calls[1].url, /\/v1\/reporting\/transactions/);
    assert.match(calls[1].url, /start_date=2024-01-01/);
  });

  it("getBalances hits reporting endpoint", async () => {
    mockFetch(mockApi({ body: { balances: [] } }));
    const c = makeClient();
    await c.getBalances();
    assert.match(calls[1].url, /\/v1\/reporting\/balances/);
  });
});

// ── Crypto Onramp ──────────────────────────────────────────────────────

describe("PayPalClient: crypto onramp", () => {
  it("createOnrampSession posts to onramp API", async () => {
    mockFetch(mockApi({ body: { id: "SES-1" } }));
    const c = makeClient();
    await c.createOnrampSession({ source_currency: "USD" });
    assert.match(calls[1].url, /\/v1\/crypto\/onramp\/sessions$/);
  });

  it("getOnrampQuotes passes query params", async () => {
    mockFetch(mockApi({ body: { quotes: [] } }));
    const c = makeClient();
    await c.getOnrampQuotes({ source_currency: "USD" });
    assert.match(calls[1].url, /\/v1\/crypto\/onramp\/quotes/);
  });
});

// ── Identity ───────────────────────────────────────────────────────────

describe("PayPalClient: identity", () => {
  it("getUserInfo hits identity endpoint with openid schema", async () => {
    mockFetch(mockApi({ body: { user_id: "U-1" } }));
    const c = makeClient();
    await c.getUserInfo();
    assert.match(calls[1].url, /\/v1\/identity\/oauth2\/userinfo/);
    assert.match(calls[1].url, /schema=openid/);
  });
});

// ── Error handling ─────────────────────────────────────────────────────

describe("PayPalClient: error handling", () => {
  it("throws on HTTP error with status code", async () => {
    mockFetch([
      { body: { access_token: "tok", expires_in: 3600 } },
      { status: 404, body: '{"name":"RESOURCE_NOT_FOUND"}' },
    ]);
    const c = makeClient();
    await assert.rejects(
      () => c.getOrder("NONEXISTENT"),
      (err) => err.code === "HTTP_ERROR" && err.message.includes("404"),
    );
  });

  it("returns {success: true} for 204 No Content", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.deleteWebhook("WH-1");
    assert.deepEqual(r, { success: true });
  });

  it("returns {success: true} for 200 with empty body", async () => {
    mockFetch([
      { body: { access_token: "tok", expires_in: 3600 } },
      { status: 200, body: "" },
    ]);
    const c = makeClient();
    const r = await c.activatePlan("P-1");
    assert.deepEqual(r, { success: true });
  });

  it("throws on unparseable response body", async () => {
    mockFetch([
      { body: { access_token: "tok", expires_in: 3600 } },
      { status: 200, body: "<html>not json</html>" },
    ]);
    const c = makeClient();
    await assert.rejects(
      () => c.getOrder("ORD-1"),
      (err) => err.code === "INVALID_RESPONSE",
    );
  });

  it("retries on 429 then succeeds", async () => {
    mockFetch([
      { body: { access_token: "tok", expires_in: 3600 } },
      { status: 429, body: "Rate limited" },
      { body: { id: "ORD-1" } },
    ]);
    const c = makeClient();
    const r = await c.getOrder("ORD-1");
    assert.equal(r.id, "ORD-1");
    assert.equal(calls.length, 3);
  });

  it("retries on 500 then succeeds", async () => {
    mockFetch([
      { body: { access_token: "tok", expires_in: 3600 } },
      { status: 500, body: "Server Error" },
      { body: { id: "ORD-1" } },
    ]);
    const c = makeClient();
    const r = await c.getOrder("ORD-1");
    assert.equal(r.id, "ORD-1");
  });
});

// ── OAuth token acquisition ────────────────────────────────────────────

describe("PayPalClient: OAuth token acquisition", () => {
  it("sends form-encoded grant_type to token endpoint", async () => {
    mockFetch(mockApi({ body: { id: "ORD-1" } }));
    const c = makeClient();
    await c.getOrder("ORD-1");
    const tokenCall = calls[0];
    assert.match(tokenCall.url, /\/v1\/oauth2\/token$/);
    assert.equal(tokenCall.options.method, "POST");
    assert.equal(tokenCall.options.body, "grant_type=client_credentials");
    assert.equal(
      tokenCall.options.headers["Content-Type"],
      "application/x-www-form-urlencoded",
    );
  });

  it("uses Bearer token from OAuth response for API calls", async () => {
    mockFetch([
      { body: { access_token: "my_bearer_token", expires_in: 3600 } },
      { body: { id: "ORD-1" } },
    ]);
    const c = makeClient();
    await c.getOrder("ORD-1");
    assert.equal(
      calls[1].options.headers.Authorization,
      "Bearer my_bearer_token",
    );
  });

  it("throws OAUTH_FAILED when token response has no access_token", async () => {
    mockFetch([{ body: { error: "invalid_client" } }]);
    const c = makeClient();
    await assert.rejects(
      () => c.getOrder("x"),
      (err) => err.code === "OAUTH_FAILED",
    );
  });
});

// ── URL construction ───────────────────────────────────────────────────

describe("PayPalClient: URL construction", () => {
  it("builds query string from params object", async () => {
    mockFetch(mockApi({ body: { products: [] } }));
    const c = makeClient();
    await c.listProducts({ page_size: "10", page: "2" });
    const url = calls[1].url;
    assert.match(url, /page_size=10/);
    assert.match(url, /page=2/);
  });

  it("omits empty query values", async () => {
    mockFetch(mockApi({ body: { products: [] } }));
    const c = makeClient();
    await c.listProducts({ page_size: "", page: null });
    const url = calls[1].url;
    assert.ok(!url.includes("page_size"));
    assert.ok(!url.includes("page="));
  });

  it("prepends baseUrl to relative paths", async () => {
    mockFetch(mockApi({ body: { id: "ORD-1" } }));
    const c = makeClient();
    await c.getOrder("ORD-1");
    assert.ok(calls[1].url.startsWith("https://api-m.sandbox.paypal.com"));
  });

  it("constructs correct paths for nested resources", async () => {
    mockFetch(mockApi({ body: { transactions: [] } }));
    const c = makeClient();
    await c.listSubscriptionTransactions("SUB-99", {
      start_time: "2024-01-01",
    });
    assert.match(
      calls[1].url,
      /\/v1\/billing\/subscriptions\/SUB-99\/transactions/,
    );
  });
});

// ── 204 No Content handling ───────────────────────────────────────────

describe("PayPalClient: 204 No Content handling", () => {
  it("returns {success: true} for DELETE 204", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.deleteWebhook("WH-1");
    assert.deepEqual(r, { success: true });
  });

  it("returns {success: true} for POST 204 (deactivate-plan)", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.deactivatePlan("P-1");
    assert.deepEqual(r, { success: true });
  });

  it("returns {success: true} for PATCH 204 (update-product)", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.updateProduct("PROD-1", [
      { op: "replace", path: "/description", value: "Updated" },
    ]);
    assert.deepEqual(r, { success: true });
  });
});

// ── Orders (additional) ───────────────────────────────────────────────

describe("PayPalClient: orders (additional)", () => {
  it("authorizeOrder posts to authorize endpoint", async () => {
    mockFetch(mockApi({ body: { id: "ORD-1", status: "COMPLETED" } }));
    const c = makeClient();
    const r = await c.authorizeOrder("ORD-1");
    assert.match(calls[1].url, /\/ORD-1\/authorize$/);
    assert.equal(calls[1].options.method, "POST");
    assert.equal(r.status, "COMPLETED");
  });

  it("authorizeOrder sends body when provided", async () => {
    mockFetch(mockApi({ body: { id: "ORD-1" } }));
    const c = makeClient();
    await c.authorizeOrder("ORD-1", { payment_source: {} });
    const body = JSON.parse(calls[1].options.body);
    assert.deepEqual(body, { payment_source: {} });
  });

  it("confirmOrder posts to confirm-payment-source", async () => {
    mockFetch(mockApi({ body: { id: "ORD-1", status: "APPROVED" } }));
    const c = makeClient();
    const r = await c.confirmOrder("ORD-1", { payment_source: {} });
    assert.match(calls[1].url, /\/ORD-1\/confirm-payment-source$/);
    assert.equal(r.status, "APPROVED");
  });

  it("updateOrderTracking patches tracker by IDs", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.updateOrderTracking("ORD-1", "TRK-1", [
      { op: "replace", path: "/notify_buyer", value: true },
    ]);
    assert.match(calls[1].url, /\/ORD-1\/trackers\/TRK-1$/);
    assert.equal(calls[1].options.method, "PATCH");
    assert.deepEqual(r, { success: true });
  });
});

// ── Payments (additional) ─────────────────────────────────────────────

describe("PayPalClient: payments (additional)", () => {
  it("reauthorize posts to reauthorize endpoint", async () => {
    mockFetch(mockApi({ body: { id: "AUTH-1" } }));
    const c = makeClient();
    const r = await c.reauthorize("AUTH-1");
    assert.match(calls[1].url, /\/AUTH-1\/reauthorize$/);
    assert.equal(calls[1].options.method, "POST");
    assert.equal(r.id, "AUTH-1");
  });

  it("reauthorize sends body when provided", async () => {
    mockFetch(mockApi({ body: { id: "AUTH-1" } }));
    const c = makeClient();
    await c.reauthorize("AUTH-1", { amount: { value: "10.00" } });
    const body = JSON.parse(calls[1].options.body);
    assert.deepEqual(body, { amount: { value: "10.00" } });
  });

  it("getCapture fetches capture by ID", async () => {
    mockFetch(mockApi({ body: { id: "CAP-1", status: "COMPLETED" } }));
    const c = makeClient();
    const r = await c.getCapture("CAP-1");
    assert.match(calls[1].url, /\/v2\/payments\/captures\/CAP-1$/);
    assert.equal(calls[1].options.method, "GET");
    assert.equal(r.id, "CAP-1");
  });
});

// ── Payouts (additional) ──────────────────────────────────────────────

describe("PayPalClient: payouts (additional)", () => {
  it("getPayout fetches payout batch by ID", async () => {
    mockFetch(mockApi({ body: { batch_header: { payout_batch_id: "PB-1" } } }));
    const c = makeClient();
    const r = await c.getPayout("PB-1");
    assert.match(calls[1].url, /\/v1\/payments\/payouts\/PB-1$/);
    assert.equal(calls[1].options.method, "GET");
    assert.equal(r.batch_header.payout_batch_id, "PB-1");
  });

  it("getPayoutItem fetches item by ID", async () => {
    mockFetch(mockApi({ body: { payout_item_id: "PI-1" } }));
    const c = makeClient();
    const r = await c.getPayoutItem("PI-1");
    assert.match(calls[1].url, /\/v1\/payments\/payouts-item\/PI-1$/);
    assert.equal(calls[1].options.method, "GET");
    assert.equal(r.payout_item_id, "PI-1");
  });
});

// ── Billing Plans (additional) ────────────────────────────────────────

describe("PayPalClient: billing plans (additional)", () => {
  it("createPlan posts to billing plans API", async () => {
    mockFetch(mockApi({ body: { id: "P-1", status: "CREATED" } }));
    const c = makeClient();
    const r = await c.createPlan({ name: "Test Plan" });
    assert.match(calls[1].url, /\/v1\/billing\/plans$/);
    assert.equal(calls[1].options.method, "POST");
    assert.equal(r.id, "P-1");
  });

  it("listPlans passes query params", async () => {
    mockFetch(mockApi({ body: { plans: [] } }));
    const c = makeClient();
    await c.listPlans({ page_size: "10", page: "1" });
    assert.match(calls[1].url, /\/v1\/billing\/plans/);
    assert.match(calls[1].url, /page_size=10/);
  });

  it("getPlan fetches plan by ID", async () => {
    mockFetch(mockApi({ body: { id: "P-1" } }));
    const c = makeClient();
    const r = await c.getPlan("P-1");
    assert.match(calls[1].url, /\/v1\/billing\/plans\/P-1$/);
    assert.equal(r.id, "P-1");
  });

  it("updatePlan patches plan", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.updatePlan("P-1", [
      { op: "replace", path: "/name", value: "Updated" },
    ]);
    assert.match(calls[1].url, /\/v1\/billing\/plans\/P-1$/);
    assert.equal(calls[1].options.method, "PATCH");
    assert.deepEqual(r, { success: true });
  });

  it("activatePlan posts to activate endpoint", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.activatePlan("P-1");
    assert.match(calls[1].url, /\/P-1\/activate$/);
    assert.deepEqual(r, { success: true });
  });

  it("updatePlanPricing posts pricing schemes", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.updatePlanPricing("P-1", {
      pricing_schemes: [{ billing_cycle_sequence: 1 }],
    });
    assert.match(calls[1].url, /\/P-1\/update-pricing-schemes$/);
    assert.equal(calls[1].options.method, "POST");
    assert.deepEqual(r, { success: true });
  });
});

// ── Subscriptions (additional) ────────────────────────────────────────

describe("PayPalClient: subscriptions (additional)", () => {
  it("getSubscription fetches by ID", async () => {
    mockFetch(mockApi({ body: { id: "SUB-1", status: "ACTIVE" } }));
    const c = makeClient();
    const r = await c.getSubscription("SUB-1");
    assert.match(calls[1].url, /\/v1\/billing\/subscriptions\/SUB-1$/);
    assert.equal(r.status, "ACTIVE");
  });

  it("updateSubscription patches subscription", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.updateSubscription("SUB-1", [
      { op: "replace", path: "/plan" },
    ]);
    assert.match(calls[1].url, /\/subscriptions\/SUB-1$/);
    assert.equal(calls[1].options.method, "PATCH");
    assert.deepEqual(r, { success: true });
  });

  it("reviseSubscription posts revision", async () => {
    mockFetch(mockApi({ body: { plan_id: "P-2" } }));
    const c = makeClient();
    const r = await c.reviseSubscription("SUB-1", { plan_id: "P-2" });
    assert.match(calls[1].url, /\/SUB-1\/revise$/);
    assert.equal(calls[1].options.method, "POST");
    assert.equal(r.plan_id, "P-2");
  });

  it("activateSubscription posts with default reason", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.activateSubscription("SUB-1");
    assert.match(calls[1].url, /\/SUB-1\/activate$/);
    const body = JSON.parse(calls[1].options.body);
    assert.ok(body.reason);
  });

  it("activateSubscription posts with custom body", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.activateSubscription("SUB-1", { reason: "Custom" });
    const body = JSON.parse(calls[1].options.body);
    assert.equal(body.reason, "Custom");
  });

  it("captureSubscription posts capture", async () => {
    mockFetch(mockApi({ body: { status: "COMPLETED" } }));
    const c = makeClient();
    const r = await c.captureSubscription("SUB-1", {
      note: "Charging",
      amount: { value: "5.00" },
    });
    assert.match(calls[1].url, /\/SUB-1\/capture$/);
    assert.equal(r.status, "COMPLETED");
  });
});

// ── Invoicing (additional) ────────────────────────────────────────────

describe("PayPalClient: invoicing (additional)", () => {
  it("listInvoices passes query params", async () => {
    mockFetch(mockApi({ body: { items: [] } }));
    const c = makeClient();
    await c.listInvoices({ page: "1", page_size: "10" });
    assert.match(calls[1].url, /\/v2\/invoicing\/invoices/);
    assert.match(calls[1].url, /page=1/);
  });

  it("getInvoice fetches by ID", async () => {
    mockFetch(mockApi({ body: { id: "INV-1" } }));
    const c = makeClient();
    const r = await c.getInvoice("INV-1");
    assert.match(calls[1].url, /\/v2\/invoicing\/invoices\/INV-1$/);
    assert.equal(r.id, "INV-1");
  });

  it("updateInvoice puts full invoice", async () => {
    mockFetch(mockApi({ body: { id: "INV-1" } }));
    const c = makeClient();
    const r = await c.updateInvoice("INV-1", { detail: {} });
    assert.match(calls[1].url, /\/invoices\/INV-1$/);
    assert.equal(calls[1].options.method, "PUT");
    assert.equal(r.id, "INV-1");
  });

  it("deleteInvoice sends DELETE", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.deleteInvoice("INV-1");
    assert.match(calls[1].url, /\/invoices\/INV-1$/);
    assert.equal(calls[1].options.method, "DELETE");
    assert.deepEqual(r, { success: true });
  });

  it("remindInvoice posts to remind endpoint", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.remindInvoice("INV-1");
    assert.match(calls[1].url, /\/INV-1\/remind$/);
    assert.equal(calls[1].options.method, "POST");
  });

  it("cancelInvoice posts to cancel endpoint", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.cancelInvoice("INV-1");
    assert.match(calls[1].url, /\/INV-1\/cancel$/);
    assert.equal(calls[1].options.method, "POST");
  });

  it("recordInvoicePayment posts payment", async () => {
    mockFetch(mockApi({ body: { id: "PAY-1" } }));
    const c = makeClient();
    const r = await c.recordInvoicePayment("INV-1", {
      method: "BANK_TRANSFER",
    });
    assert.match(calls[1].url, /\/INV-1\/payments$/);
    assert.equal(calls[1].options.method, "POST");
  });

  it("recordInvoiceRefund posts refund", async () => {
    mockFetch(mockApi({ body: { refund_id: "REF-1" } }));
    const c = makeClient();
    await c.recordInvoiceRefund("INV-1", { method: "BANK_TRANSFER" });
    assert.match(calls[1].url, /\/INV-1\/refunds$/);
    assert.equal(calls[1].options.method, "POST");
  });

  it("generateInvoiceQr posts with default dimensions", async () => {
    mockFetch(mockApi({ body: { base64_image: "data..." } }));
    const c = makeClient();
    await c.generateInvoiceQr("INV-1");
    assert.match(calls[1].url, /\/INV-1\/generate-qr-code$/);
    const body = JSON.parse(calls[1].options.body);
    assert.equal(body.width, 400);
    assert.equal(body.height, 400);
  });

  it("generateInvoiceQr posts with custom body", async () => {
    mockFetch(mockApi({ body: { base64_image: "data..." } }));
    const c = makeClient();
    await c.generateInvoiceQr("INV-1", { width: 200, height: 200 });
    const body = JSON.parse(calls[1].options.body);
    assert.equal(body.width, 200);
  });

  it("listInvoiceTemplates passes query", async () => {
    mockFetch(mockApi({ body: { templates: [] } }));
    const c = makeClient();
    await c.listInvoiceTemplates({ page: "1" });
    assert.match(calls[1].url, /\/v2\/invoicing\/templates/);
    assert.match(calls[1].url, /page=1/);
  });

  it("createInvoiceTemplate posts template", async () => {
    mockFetch(mockApi({ body: { id: "TMPL-1" } }));
    const c = makeClient();
    const r = await c.createInvoiceTemplate({ name: "My Template" });
    assert.match(calls[1].url, /\/v2\/invoicing\/templates$/);
    assert.equal(calls[1].options.method, "POST");
    assert.equal(r.id, "TMPL-1");
  });

  it("getInvoiceTemplate fetches by ID", async () => {
    mockFetch(mockApi({ body: { id: "TMPL-1" } }));
    const c = makeClient();
    const r = await c.getInvoiceTemplate("TMPL-1");
    assert.match(calls[1].url, /\/templates\/TMPL-1$/);
    assert.equal(r.id, "TMPL-1");
  });

  it("updateInvoiceTemplate puts full template", async () => {
    mockFetch(mockApi({ body: { id: "TMPL-1" } }));
    const c = makeClient();
    await c.updateInvoiceTemplate("TMPL-1", { name: "Updated" });
    assert.match(calls[1].url, /\/templates\/TMPL-1$/);
    assert.equal(calls[1].options.method, "PUT");
  });

  it("deleteInvoiceTemplate sends DELETE", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.deleteInvoiceTemplate("TMPL-1");
    assert.match(calls[1].url, /\/templates\/TMPL-1$/);
    assert.equal(calls[1].options.method, "DELETE");
    assert.deepEqual(r, { success: true });
  });
});

// ── Disputes (additional) ─────────────────────────────────────────────

describe("PayPalClient: disputes (additional)", () => {
  it("getDispute fetches by ID", async () => {
    mockFetch(mockApi({ body: { dispute_id: "DIS-1" } }));
    const c = makeClient();
    const r = await c.getDispute("DIS-1");
    assert.match(calls[1].url, /\/v1\/customer\/disputes\/DIS-1$/);
    assert.equal(r.dispute_id, "DIS-1");
  });

  it("acceptDisputeClaim posts with default empty body", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.acceptDisputeClaim("DIS-1");
    assert.match(calls[1].url, /\/DIS-1\/accept-claim$/);
    assert.equal(calls[1].options.method, "POST");
  });

  it("escalateDispute posts with default note", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.escalateDispute("DIS-1");
    assert.match(calls[1].url, /\/DIS-1\/escalate$/);
    const body = JSON.parse(calls[1].options.body);
    assert.ok(body.note);
  });

  it("appealDispute posts appeal body", async () => {
    mockFetch(mockApi({ body: { links: [] } }));
    const c = makeClient();
    await c.appealDispute("DIS-1", { reason: "I disagree" });
    assert.match(calls[1].url, /\/DIS-1\/appeal$/);
    assert.equal(calls[1].options.method, "POST");
  });

  it("sendDisputeMessage posts message", async () => {
    mockFetch(mockApi({ body: { links: [] } }));
    const c = makeClient();
    await c.sendDisputeMessage("DIS-1", { message: "Hello" });
    assert.match(calls[1].url, /\/DIS-1\/send-message$/);
  });

  it("acceptDisputeOffer posts with default empty body", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.acceptDisputeOffer("DIS-1");
    assert.match(calls[1].url, /\/DIS-1\/accept-offer$/);
    assert.equal(calls[1].options.method, "POST");
  });

  it("denyDisputeOffer posts with default empty body", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    await c.denyDisputeOffer("DIS-1");
    assert.match(calls[1].url, /\/DIS-1\/deny-offer$/);
    assert.equal(calls[1].options.method, "POST");
  });
});

// ── Vault (additional) ────────────────────────────────────────────────

describe("PayPalClient: vault (additional)", () => {
  it("getSetupToken fetches by ID", async () => {
    mockFetch(mockApi({ body: { id: "ST-1" } }));
    const c = makeClient();
    const r = await c.getSetupToken("ST-1");
    assert.match(calls[1].url, /\/v3\/vault\/setup-tokens\/ST-1$/);
    assert.equal(r.id, "ST-1");
  });

  it("createPaymentToken posts to vault v3", async () => {
    mockFetch(mockApi({ body: { id: "PT-1" } }));
    const c = makeClient();
    const r = await c.createPaymentToken({ payment_source: {} });
    assert.match(calls[1].url, /\/v3\/vault\/payment-tokens$/);
    assert.equal(calls[1].options.method, "POST");
    assert.equal(r.id, "PT-1");
  });

  it("listPaymentTokens passes query params", async () => {
    mockFetch(mockApi({ body: { payment_tokens: [] } }));
    const c = makeClient();
    await c.listPaymentTokens({ customer_id: "C-1" });
    assert.match(calls[1].url, /\/v3\/vault\/payment-tokens/);
    assert.match(calls[1].url, /customer_id=C-1/);
  });

  it("getPaymentToken fetches by ID", async () => {
    mockFetch(mockApi({ body: { id: "PT-1" } }));
    const c = makeClient();
    const r = await c.getPaymentToken("PT-1");
    assert.match(calls[1].url, /\/payment-tokens\/PT-1$/);
    assert.equal(calls[1].options.method, "GET");
    assert.equal(r.id, "PT-1");
  });
});

// ── Products (additional) ─────────────────────────────────────────────

describe("PayPalClient: products (additional)", () => {
  it("getProduct fetches by ID", async () => {
    mockFetch(mockApi({ body: { id: "PROD-1", name: "Widget" } }));
    const c = makeClient();
    const r = await c.getProduct("PROD-1");
    assert.match(calls[1].url, /\/v1\/catalogs\/products\/PROD-1$/);
    assert.equal(r.name, "Widget");
  });

  it("updateProduct patches product", async () => {
    mockFetch(mockApi({ status: 204 }));
    const c = makeClient();
    const r = await c.updateProduct("PROD-1", [
      { op: "replace", path: "/name", value: "New Name" },
    ]);
    assert.match(calls[1].url, /\/products\/PROD-1$/);
    assert.equal(calls[1].options.method, "PATCH");
    assert.deepEqual(r, { success: true });
  });
});

// ── Webhooks (additional) ─────────────────────────────────────────────

describe("PayPalClient: webhooks (additional)", () => {
  it("listWebhooks fetches all webhooks", async () => {
    mockFetch(mockApi({ body: { webhooks: [] } }));
    const c = makeClient();
    const r = await c.listWebhooks();
    assert.match(calls[1].url, /\/v1\/notifications\/webhooks$/);
    assert.equal(calls[1].options.method, "GET");
    assert.deepEqual(r.webhooks, []);
  });

  it("getWebhook fetches by ID", async () => {
    mockFetch(mockApi({ body: { id: "WH-1" } }));
    const c = makeClient();
    const r = await c.getWebhook("WH-1");
    assert.match(calls[1].url, /\/webhooks\/WH-1$/);
    assert.equal(r.id, "WH-1");
  });

  it("updateWebhook patches webhook", async () => {
    mockFetch(mockApi({ body: { id: "WH-1" } }));
    const c = makeClient();
    await c.updateWebhook("WH-1", [
      { op: "replace", path: "/url", value: "https://new.example.com" },
    ]);
    assert.match(calls[1].url, /\/webhooks\/WH-1$/);
    assert.equal(calls[1].options.method, "PATCH");
  });

  it("listWebhookEventTypes fetches event types", async () => {
    mockFetch(mockApi({ body: { event_types: [] } }));
    const c = makeClient();
    const r = await c.listWebhookEventTypes();
    assert.match(calls[1].url, /\/webhooks-event-types$/);
    assert.deepEqual(r.event_types, []);
  });

  it("listWebhookEvents passes query params", async () => {
    mockFetch(mockApi({ body: { events: [] } }));
    const c = makeClient();
    await c.listWebhookEvents({ start_time: "2024-01-01" });
    assert.match(calls[1].url, /\/webhooks-events/);
    assert.match(calls[1].url, /start_time=2024-01-01/);
  });

  it("getWebhookEvent fetches by ID", async () => {
    mockFetch(mockApi({ body: { id: "EVT-1" } }));
    const c = makeClient();
    const r = await c.getWebhookEvent("EVT-1");
    assert.match(calls[1].url, /\/webhooks-events\/EVT-1$/);
    assert.equal(r.id, "EVT-1");
  });

  it("resendWebhookEvent posts with default empty body", async () => {
    mockFetch(mockApi({ body: { id: "EVT-1" } }));
    const c = makeClient();
    await c.resendWebhookEvent("EVT-1");
    assert.match(calls[1].url, /\/EVT-1\/resend$/);
    assert.equal(calls[1].options.method, "POST");
  });

  it("simulateWebhookEvent posts simulation body", async () => {
    mockFetch(mockApi({ body: { id: "EVT-SIM" } }));
    const c = makeClient();
    await c.simulateWebhookEvent({
      event_type: "PAYMENT.CAPTURE.COMPLETED",
    });
    assert.match(calls[1].url, /\/simulate-event$/);
    assert.equal(calls[1].options.method, "POST");
  });
});

// ── Crypto Onramp (additional) ────────────────────────────────────────

describe("PayPalClient: crypto onramp (additional)", () => {
  it("getOnrampSession fetches session by ID", async () => {
    mockFetch(mockApi({ body: { id: "SES-1", status: "CREATED" } }));
    const c = makeClient();
    const r = await c.getOnrampSession("SES-1");
    assert.match(calls[1].url, /\/v1\/crypto\/onramp\/sessions\/SES-1$/);
    assert.equal(calls[1].options.method, "GET");
    assert.equal(r.id, "SES-1");
  });
});
