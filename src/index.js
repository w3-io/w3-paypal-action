const core = require("@actions/core");

async function run() {
  try {
    const command = core.getInput("command", { required: true }).toLowerCase();
    const clientId = core.getInput("client-id", { required: true });
    const clientSecret = core.getInput("client-secret", { required: true });
    const apiUrl =
      core.getInput("api-url") || "https://api-m.sandbox.paypal.com";

    // Common inputs
    const body = core.getInput("body") || "";
    const orderId = core.getInput("order-id") || "";
    const authorizationId = core.getInput("authorization-id") || "";
    const captureId = core.getInput("capture-id") || "";
    const refundId = core.getInput("refund-id") || "";
    const payoutId = core.getInput("payout-id") || "";
    const itemId = core.getInput("item-id") || "";
    const planId = core.getInput("plan-id") || "";
    const subscriptionId = core.getInput("subscription-id") || "";
    const invoiceId = core.getInput("invoice-id") || "";
    const templateId = core.getInput("template-id") || "";
    const disputeId = core.getInput("dispute-id") || "";
    const tokenId = core.getInput("token-id") || "";
    const productId = core.getInput("product-id") || "";
    const trackerId = core.getInput("tracker-id") || "";
    const webhookId = core.getInput("webhook-id") || "";
    const eventId = core.getInput("event-id") || "";
    const transactionId = core.getInput("transaction-id") || "";
    const paymentId = core.getInput("payment-id") || "";

    // Query/filter inputs
    const startDate = core.getInput("start-date") || "";
    const endDate = core.getInput("end-date") || "";
    const status = core.getInput("status") || "";
    const page = core.getInput("page") || "";
    const pageSize = core.getInput("page-size") || "";
    const totalRequired = core.getInput("total-required") || "";
    const fields = core.getInput("fields") || "";
    const transactionType = core.getInput("transaction-type") || "";
    const transactionStatus = core.getInput("transaction-status") || "";
    const currencyCode = core.getInput("currency-code") || "";
    const transactionAmount = core.getInput("transaction-amount") || "";
    const balanceDate = core.getInput("balance-date") || "";

    // --- OAuth2 Token ---
    const tokenRes = await fetch(`${apiUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(
        `OAuth failed: ${tokenData.error_description || JSON.stringify(tokenData)}`,
      );
    }
    const token = tokenData.access_token;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    async function request(method, path, bodyObj, extraHeaders) {
      const url = `${apiUrl}${path}`;
      const opts = { method, headers: { ...headers, ...extraHeaders } };
      if (
        bodyObj &&
        (method === "POST" || method === "PUT" || method === "PATCH")
      ) {
        opts.body = JSON.stringify(bodyObj);
      }
      const res = await fetch(url, opts);
      if (res.status === 204) return { success: true };
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      if (!res.ok) {
        const msg = typeof data === "object" ? JSON.stringify(data) : data;
        throw new Error(`${method} ${path} returned ${res.status}: ${msg}`);
      }
      return data;
    }

    function qs(params) {
      const entries = Object.entries(params).filter(([, v]) => v !== "");
      return entries.length
        ? "?" + entries.map(([k, v]) => `${k}=${v}`).join("&")
        : "";
    }

    function parseBody() {
      if (!body) throw new Error("body input is required for this command");
      return JSON.parse(body);
    }

    let result;

    switch (command) {
      // =================================================================
      // ORDERS
      // =================================================================

      case "create-order":
        result = await request("POST", "/v2/checkout/orders", parseBody());
        break;

      case "get-order":
        if (!orderId) throw new Error("order-id is required");
        result = await request("GET", `/v2/checkout/orders/${orderId}`);
        break;

      case "update-order":
        if (!orderId) throw new Error("order-id is required");
        result = await request(
          "PATCH",
          `/v2/checkout/orders/${orderId}`,
          parseBody(),
        );
        break;

      case "authorize-order":
        if (!orderId) throw new Error("order-id is required");
        result = await request(
          "POST",
          `/v2/checkout/orders/${orderId}/authorize`,
          body ? parseBody() : {},
        );
        break;

      case "capture-order":
        if (!orderId) throw new Error("order-id is required");
        result = await request(
          "POST",
          `/v2/checkout/orders/${orderId}/capture`,
          body ? parseBody() : {},
        );
        break;

      case "confirm-order":
        if (!orderId) throw new Error("order-id is required");
        result = await request(
          "POST",
          `/v2/checkout/orders/${orderId}/confirm-payment-source`,
          parseBody(),
        );
        break;

      case "track-order":
        if (!orderId) throw new Error("order-id is required");
        result = await request(
          "POST",
          `/v2/checkout/orders/${orderId}/track`,
          parseBody(),
        );
        break;

      case "update-order-tracking":
        if (!orderId) throw new Error("order-id is required");
        if (!trackerId) throw new Error("tracker-id is required");
        result = await request(
          "PATCH",
          `/v2/checkout/orders/${orderId}/trackers/${trackerId}`,
          parseBody(),
        );
        break;

      // =================================================================
      // PAYMENTS (post-order lifecycle)
      // =================================================================

      case "get-authorization":
        if (!authorizationId) throw new Error("authorization-id is required");
        result = await request(
          "GET",
          `/v2/payments/authorizations/${authorizationId}`,
        );
        break;

      case "capture-authorization":
        if (!authorizationId) throw new Error("authorization-id is required");
        result = await request(
          "POST",
          `/v2/payments/authorizations/${authorizationId}/capture`,
          body ? parseBody() : {},
        );
        break;

      case "reauthorize":
        if (!authorizationId) throw new Error("authorization-id is required");
        result = await request(
          "POST",
          `/v2/payments/authorizations/${authorizationId}/reauthorize`,
          body ? parseBody() : {},
        );
        break;

      case "void-authorization":
        if (!authorizationId) throw new Error("authorization-id is required");
        result = await request(
          "POST",
          `/v2/payments/authorizations/${authorizationId}/void`,
        );
        break;

      case "get-capture":
        if (!captureId) throw new Error("capture-id is required");
        result = await request("GET", `/v2/payments/captures/${captureId}`);
        break;

      case "refund-capture":
        if (!captureId) throw new Error("capture-id is required");
        result = await request(
          "POST",
          `/v2/payments/captures/${captureId}/refund`,
          body ? parseBody() : {},
        );
        break;

      case "get-refund":
        if (!refundId) throw new Error("refund-id is required");
        result = await request("GET", `/v2/payments/refunds/${refundId}`);
        break;

      // =================================================================
      // PAYOUTS
      // =================================================================

      case "create-payout":
        result = await request("POST", "/v1/payments/payouts", parseBody());
        break;

      case "get-payout":
        if (!payoutId) throw new Error("payout-id is required");
        result = await request("GET", `/v1/payments/payouts/${payoutId}`);
        break;

      case "get-payout-item":
        if (!itemId) throw new Error("item-id is required");
        result = await request("GET", `/v1/payments/payouts-item/${itemId}`);
        break;

      case "cancel-payout-item":
        if (!itemId) throw new Error("item-id is required");
        result = await request(
          "POST",
          `/v1/payments/payouts-item/${itemId}/cancel`,
        );
        break;

      // =================================================================
      // SUBSCRIPTIONS — Plans
      // =================================================================

      case "create-plan":
        result = await request("POST", "/v1/billing/plans", parseBody());
        break;

      case "list-plans":
        result = await request(
          "GET",
          `/v1/billing/plans${qs({ page_size: pageSize, page: page, total_required: totalRequired })}`,
        );
        break;

      case "get-plan":
        if (!planId) throw new Error("plan-id is required");
        result = await request("GET", `/v1/billing/plans/${planId}`);
        break;

      case "update-plan":
        if (!planId) throw new Error("plan-id is required");
        result = await request(
          "PATCH",
          `/v1/billing/plans/${planId}`,
          parseBody(),
        );
        break;

      case "activate-plan":
        if (!planId) throw new Error("plan-id is required");
        result = await request(
          "POST",
          `/v1/billing/plans/${planId}/activate`,
        );
        break;

      case "deactivate-plan":
        if (!planId) throw new Error("plan-id is required");
        result = await request(
          "POST",
          `/v1/billing/plans/${planId}/deactivate`,
        );
        break;

      case "update-plan-pricing":
        if (!planId) throw new Error("plan-id is required");
        result = await request(
          "POST",
          `/v1/billing/plans/${planId}/update-pricing-schemes`,
          parseBody(),
        );
        break;

      // =================================================================
      // SUBSCRIPTIONS — Subscriptions
      // =================================================================

      case "create-subscription":
        result = await request(
          "POST",
          "/v1/billing/subscriptions",
          parseBody(),
        );
        break;

      case "get-subscription":
        if (!subscriptionId) throw new Error("subscription-id is required");
        result = await request(
          "GET",
          `/v1/billing/subscriptions/${subscriptionId}`,
        );
        break;

      case "update-subscription":
        if (!subscriptionId) throw new Error("subscription-id is required");
        result = await request(
          "PATCH",
          `/v1/billing/subscriptions/${subscriptionId}`,
          parseBody(),
        );
        break;

      case "revise-subscription":
        if (!subscriptionId) throw new Error("subscription-id is required");
        result = await request(
          "POST",
          `/v1/billing/subscriptions/${subscriptionId}/revise`,
          parseBody(),
        );
        break;

      case "suspend-subscription":
        if (!subscriptionId) throw new Error("subscription-id is required");
        result = await request(
          "POST",
          `/v1/billing/subscriptions/${subscriptionId}/suspend`,
          body ? parseBody() : { reason: "Suspended via W3 workflow" },
        );
        break;

      case "cancel-subscription":
        if (!subscriptionId) throw new Error("subscription-id is required");
        result = await request(
          "POST",
          `/v1/billing/subscriptions/${subscriptionId}/cancel`,
          body ? parseBody() : { reason: "Cancelled via W3 workflow" },
        );
        break;

      case "activate-subscription":
        if (!subscriptionId) throw new Error("subscription-id is required");
        result = await request(
          "POST",
          `/v1/billing/subscriptions/${subscriptionId}/activate`,
          body ? parseBody() : { reason: "Reactivated via W3 workflow" },
        );
        break;

      case "capture-subscription":
        if (!subscriptionId) throw new Error("subscription-id is required");
        result = await request(
          "POST",
          `/v1/billing/subscriptions/${subscriptionId}/capture`,
          parseBody(),
        );
        break;

      case "list-subscription-transactions":
        if (!subscriptionId) throw new Error("subscription-id is required");
        result = await request(
          "GET",
          `/v1/billing/subscriptions/${subscriptionId}/transactions${qs({ start_time: startDate, end_time: endDate })}`,
        );
        break;

      // =================================================================
      // INVOICING
      // =================================================================

      case "create-invoice":
        result = await request(
          "POST",
          "/v2/invoicing/invoices",
          parseBody(),
        );
        break;

      case "list-invoices":
        result = await request(
          "GET",
          `/v2/invoicing/invoices${qs({ page: page, page_size: pageSize, total_required: totalRequired, fields: fields })}`,
        );
        break;

      case "get-invoice":
        if (!invoiceId) throw new Error("invoice-id is required");
        result = await request("GET", `/v2/invoicing/invoices/${invoiceId}`);
        break;

      case "update-invoice":
        if (!invoiceId) throw new Error("invoice-id is required");
        result = await request(
          "PUT",
          `/v2/invoicing/invoices/${invoiceId}`,
          parseBody(),
        );
        break;

      case "delete-invoice":
        if (!invoiceId) throw new Error("invoice-id is required");
        result = await request(
          "DELETE",
          `/v2/invoicing/invoices/${invoiceId}`,
        );
        break;

      case "send-invoice":
        if (!invoiceId) throw new Error("invoice-id is required");
        result = await request(
          "POST",
          `/v2/invoicing/invoices/${invoiceId}/send`,
          body ? parseBody() : {},
        );
        break;

      case "remind-invoice":
        if (!invoiceId) throw new Error("invoice-id is required");
        result = await request(
          "POST",
          `/v2/invoicing/invoices/${invoiceId}/remind`,
          body ? parseBody() : {},
        );
        break;

      case "cancel-invoice":
        if (!invoiceId) throw new Error("invoice-id is required");
        result = await request(
          "POST",
          `/v2/invoicing/invoices/${invoiceId}/cancel`,
          body ? parseBody() : {},
        );
        break;

      case "record-invoice-payment":
        if (!invoiceId) throw new Error("invoice-id is required");
        result = await request(
          "POST",
          `/v2/invoicing/invoices/${invoiceId}/payments`,
          parseBody(),
        );
        break;

      case "delete-invoice-payment":
        if (!invoiceId) throw new Error("invoice-id is required");
        if (!paymentId) throw new Error("payment-id is required");
        result = await request(
          "DELETE",
          `/v2/invoicing/invoices/${invoiceId}/payments/${paymentId}`,
        );
        break;

      case "record-invoice-refund":
        if (!invoiceId) throw new Error("invoice-id is required");
        result = await request(
          "POST",
          `/v2/invoicing/invoices/${invoiceId}/refunds`,
          parseBody(),
        );
        break;

      case "generate-invoice-qr":
        if (!invoiceId) throw new Error("invoice-id is required");
        result = await request(
          "POST",
          `/v2/invoicing/invoices/${invoiceId}/generate-qr-code`,
          body ? parseBody() : { width: 400, height: 400 },
        );
        break;

      case "generate-invoice-number":
        result = await request(
          "POST",
          "/v2/invoicing/generate-next-invoice-number",
          {},
        );
        break;

      case "search-invoices":
        result = await request(
          "POST",
          "/v2/invoicing/search-invoices",
          parseBody(),
        );
        break;

      // Invoice templates
      case "list-invoice-templates":
        result = await request(
          "GET",
          `/v2/invoicing/templates${qs({ page: page, page_size: pageSize, fields: fields })}`,
        );
        break;

      case "create-invoice-template":
        result = await request(
          "POST",
          "/v2/invoicing/templates",
          parseBody(),
        );
        break;

      case "get-invoice-template":
        if (!templateId) throw new Error("template-id is required");
        result = await request(
          "GET",
          `/v2/invoicing/templates/${templateId}`,
        );
        break;

      case "update-invoice-template":
        if (!templateId) throw new Error("template-id is required");
        result = await request(
          "PUT",
          `/v2/invoicing/templates/${templateId}`,
          parseBody(),
        );
        break;

      case "delete-invoice-template":
        if (!templateId) throw new Error("template-id is required");
        result = await request(
          "DELETE",
          `/v2/invoicing/templates/${templateId}`,
        );
        break;

      // =================================================================
      // DISPUTES
      // =================================================================

      case "list-disputes":
        result = await request(
          "GET",
          `/v1/customer/disputes${qs({ start_time: startDate, dispute_state: status, page_size: pageSize })}`,
        );
        break;

      case "get-dispute":
        if (!disputeId) throw new Error("dispute-id is required");
        result = await request(
          "GET",
          `/v1/customer/disputes/${disputeId}`,
        );
        break;

      case "accept-dispute-claim":
        if (!disputeId) throw new Error("dispute-id is required");
        result = await request(
          "POST",
          `/v1/customer/disputes/${disputeId}/accept-claim`,
          body ? parseBody() : {},
        );
        break;

      case "escalate-dispute":
        if (!disputeId) throw new Error("dispute-id is required");
        result = await request(
          "POST",
          `/v1/customer/disputes/${disputeId}/escalate`,
          body ? parseBody() : { note: "Escalated via W3 workflow" },
        );
        break;

      case "provide-dispute-evidence":
        if (!disputeId) throw new Error("dispute-id is required");
        result = await request(
          "POST",
          `/v1/customer/disputes/${disputeId}/provide-evidence`,
          parseBody(),
        );
        break;

      case "appeal-dispute":
        if (!disputeId) throw new Error("dispute-id is required");
        result = await request(
          "POST",
          `/v1/customer/disputes/${disputeId}/appeal`,
          parseBody(),
        );
        break;

      case "send-dispute-message":
        if (!disputeId) throw new Error("dispute-id is required");
        result = await request(
          "POST",
          `/v1/customer/disputes/${disputeId}/send-message`,
          parseBody(),
        );
        break;

      case "make-dispute-offer":
        if (!disputeId) throw new Error("dispute-id is required");
        result = await request(
          "POST",
          `/v1/customer/disputes/${disputeId}/make-offer`,
          parseBody(),
        );
        break;

      case "accept-dispute-offer":
        if (!disputeId) throw new Error("dispute-id is required");
        result = await request(
          "POST",
          `/v1/customer/disputes/${disputeId}/accept-offer`,
          body ? parseBody() : {},
        );
        break;

      case "deny-dispute-offer":
        if (!disputeId) throw new Error("dispute-id is required");
        result = await request(
          "POST",
          `/v1/customer/disputes/${disputeId}/deny-offer`,
          body ? parseBody() : {},
        );
        break;

      // =================================================================
      // VAULT / PAYMENT TOKENS
      // =================================================================

      case "create-setup-token":
        result = await request("POST", "/v3/vault/setup-tokens", parseBody());
        break;

      case "get-setup-token":
        if (!tokenId) throw new Error("token-id is required");
        result = await request("GET", `/v3/vault/setup-tokens/${tokenId}`);
        break;

      case "create-payment-token":
        result = await request(
          "POST",
          "/v3/vault/payment-tokens",
          parseBody(),
        );
        break;

      case "list-payment-tokens":
        result = await request(
          "GET",
          `/v3/vault/payment-tokens${qs({ customer_id: core.getInput("customer-id") || "" })}`,
        );
        break;

      case "get-payment-token":
        if (!tokenId) throw new Error("token-id is required");
        result = await request("GET", `/v3/vault/payment-tokens/${tokenId}`);
        break;

      case "delete-payment-token":
        if (!tokenId) throw new Error("token-id is required");
        result = await request(
          "DELETE",
          `/v3/vault/payment-tokens/${tokenId}`,
        );
        break;

      // =================================================================
      // CATALOG PRODUCTS
      // =================================================================

      case "create-product":
        result = await request(
          "POST",
          "/v1/catalogs/products",
          parseBody(),
        );
        break;

      case "list-products":
        result = await request(
          "GET",
          `/v1/catalogs/products${qs({ page_size: pageSize, page: page, total_required: totalRequired })}`,
        );
        break;

      case "get-product":
        if (!productId) throw new Error("product-id is required");
        result = await request("GET", `/v1/catalogs/products/${productId}`);
        break;

      case "update-product":
        if (!productId) throw new Error("product-id is required");
        result = await request(
          "PATCH",
          `/v1/catalogs/products/${productId}`,
          parseBody(),
        );
        break;

      // =================================================================
      // REPORTING
      // =================================================================

      case "search-transactions":
        result = await request(
          "GET",
          `/v1/reporting/transactions${qs({
            start_date: startDate,
            end_date: endDate,
            transaction_id: transactionId,
            transaction_type: transactionType,
            transaction_status: transactionStatus,
            transaction_amount: transactionAmount,
            currency_code: currencyCode,
            page_size: pageSize,
            page: page,
            fields: fields,
          })}`,
        );
        break;

      case "get-balances":
        result = await request(
          "GET",
          `/v1/reporting/balances${qs({ as_of_time: balanceDate, currency_code: currencyCode })}`,
        );
        break;

      // =================================================================
      // WEBHOOKS
      // =================================================================

      case "create-webhook":
        result = await request(
          "POST",
          "/v1/notifications/webhooks",
          parseBody(),
        );
        break;

      case "list-webhooks":
        result = await request("GET", "/v1/notifications/webhooks");
        break;

      case "get-webhook":
        if (!webhookId) throw new Error("webhook-id is required");
        result = await request(
          "GET",
          `/v1/notifications/webhooks/${webhookId}`,
        );
        break;

      case "update-webhook":
        if (!webhookId) throw new Error("webhook-id is required");
        result = await request(
          "PATCH",
          `/v1/notifications/webhooks/${webhookId}`,
          parseBody(),
        );
        break;

      case "delete-webhook":
        if (!webhookId) throw new Error("webhook-id is required");
        result = await request(
          "DELETE",
          `/v1/notifications/webhooks/${webhookId}`,
        );
        break;

      case "list-webhook-event-types":
        result = await request(
          "GET",
          "/v1/notifications/webhooks-event-types",
        );
        break;

      case "list-webhook-events":
        result = await request(
          "GET",
          `/v1/notifications/webhooks-events${qs({ start_time: startDate, end_time: endDate, page_size: pageSize, event_type: core.getInput("event-type") || "" })}`,
        );
        break;

      case "get-webhook-event":
        if (!eventId) throw new Error("event-id is required");
        result = await request(
          "GET",
          `/v1/notifications/webhooks-events/${eventId}`,
        );
        break;

      case "resend-webhook-event":
        if (!eventId) throw new Error("event-id is required");
        result = await request(
          "POST",
          `/v1/notifications/webhooks-events/${eventId}/resend`,
          body ? parseBody() : {},
        );
        break;

      case "simulate-webhook-event":
        result = await request(
          "POST",
          "/v1/notifications/simulate-event",
          parseBody(),
        );
        break;

      case "verify-webhook-signature":
        result = await request(
          "POST",
          "/v1/notifications/verify-webhook-signature",
          parseBody(),
        );
        break;

      // =================================================================
      // IDENTITY
      // =================================================================

      case "get-userinfo":
        result = await request("GET", "/v1/identity/oauth2/userinfo?schema=openid");
        break;

      default:
        throw new Error(
          `Unknown command: ${command}. Run with command=help for available commands.`,
        );
    }

    core.setOutput("result", JSON.stringify(result));
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
