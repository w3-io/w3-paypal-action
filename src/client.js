/**
 * PayPal REST API client.
 *
 * Uses OAuth2 client credentials for authentication.
 * HTTP goes through `#apiCall` with retry on 429/5xx, 30s timeout,
 * and 204 No Content handling for PayPal's mutation responses.
 *
 * PayPal API docs: https://developer.paypal.com/docs/api/
 * Base URLs:
 *   Production: https://api-m.paypal.com
 *   Sandbox:    https://api-m.sandbox.paypal.com
 */

import { W3ActionError } from '@w3-io/action-core'

const DEFAULT_BASE_URL = 'https://api-m.paypal.com'
const DEFAULT_TIMEOUT_MS = 30_000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

/**
 * Fetch with timeout, retry on 429/5xx, and exponential backoff.
 * Returns the raw Response — caller handles body parsing.
 */
async function fetchWithRetry(url, opts, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    try {
      const res = await fetch(url, { ...opts, signal: controller.signal })
      clearTimeout(timer)

      // Retry on 429 (rate limit) and 5xx (server error)
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const retryAfter = res.headers.get('retry-after')
        const delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : RETRY_DELAY_MS * 2 ** attempt
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      return res
    } catch (e) {
      clearTimeout(timer)
      if (attempt < retries && (e.name === 'AbortError' || e.code === 'UND_ERR_CONNECT_TIMEOUT')) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * 2 ** attempt))
        continue
      }
      if (e.name === 'AbortError') {
        throw new W3ActionError('TIMEOUT', `Request timed out after ${DEFAULT_TIMEOUT_MS}ms: ${url}`)
      }
      throw e
    }
  }
}

export class PayPalClient {
  /**
   * @param {object} opts
   * @param {string} opts.clientId — OAuth2 Client ID
   * @param {string} opts.clientSecret — OAuth2 Client Secret
   * @param {string} [opts.baseUrl]
   */
  constructor({ clientId, clientSecret, baseUrl = DEFAULT_BASE_URL } = {}) {
    if (!clientId) throw new W3ActionError('MISSING_CLIENT_ID', 'PayPal Client ID is required')
    if (!clientSecret) throw new W3ActionError('MISSING_CLIENT_SECRET', 'PayPal Client Secret is required')
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.token = null
  }

  // ---------------------------------------------------------------------------
  // OAuth2
  // ---------------------------------------------------------------------------

  async #authenticate() {
    // Return cached token if not expired (refresh 60s before actual expiry)
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry - 60_000) {
      return this.token
    }

    // OAuth uses form-encoded body, not JSON. Use raw fetch since
    // action-core's request() always JSON.stringify's the body.
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    const res = await fetchWithRetry(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    })
    const data = await res.json()
    if (!data.access_token) {
      throw new W3ActionError(
        'OAUTH_FAILED',
        `PayPal OAuth failed: ${data.error_description || JSON.stringify(data)}`,
      )
    }
    this.token = data.access_token
    this.tokenExpiry = Date.now() + (data.expires_in || 32400) * 1000
    return this.token
  }

  // ---------------------------------------------------------------------------
  // Transport
  // ---------------------------------------------------------------------------

  async #headers(extra) {
    const token = await this.#authenticate()
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extra,
    }
  }

  // PayPal returns 204 No Content for many mutations (DELETE, PATCH,
  // POST activate/deactivate/void). action-core's request() calls
  // response.json() which fails on empty bodies. This helper handles
  // all response types correctly.
  async #apiCall(method, url, headers, body) {
    const res = await fetchWithRetry(url, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new W3ActionError('HTTP_ERROR', `${res.status}: ${text}`, { statusCode: res.status })
    }
    if (res.status === 204) return { success: true }
    const text = await res.text()
    if (!text) return { success: true }
    try { return JSON.parse(text) } catch { return { success: true } }
  }

  async get(path, query) {
    return this.#apiCall('GET', this.#buildUrl(path, query), await this.#headers())
  }

  async post(path, payload, extra) {
    return this.#apiCall('POST', this.#buildUrl(path), await this.#headers(extra), payload)
  }

  async put(path, payload) {
    return this.#apiCall('PUT', this.#buildUrl(path), await this.#headers(), payload)
  }

  async patch(path, payload) {
    return this.#apiCall('PATCH', this.#buildUrl(path), await this.#headers(), payload)
  }

  async delete(path) {
    return this.#apiCall('DELETE', this.#buildUrl(path), await this.#headers())
  }

  #buildUrl(path, query) {
    const url = new URL(path, this.baseUrl)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
      }
    }
    return url.toString()
  }

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------

  createOrder(p) { return this.post('/v2/checkout/orders', p) }
  getOrder(id) { return this.get(`/v2/checkout/orders/${id}`) }
  updateOrder(id, p) { return this.patch(`/v2/checkout/orders/${id}`, p) }
  authorizeOrder(id, p) { return this.post(`/v2/checkout/orders/${id}/authorize`, p || {}) }
  captureOrder(id, p) { return this.post(`/v2/checkout/orders/${id}/capture`, p || {}) }
  confirmOrder(id, p) { return this.post(`/v2/checkout/orders/${id}/confirm-payment-source`, p) }
  trackOrder(id, p) { return this.post(`/v2/checkout/orders/${id}/track`, p) }
  updateOrderTracking(oid, tid, p) { return this.patch(`/v2/checkout/orders/${oid}/trackers/${tid}`, p) }

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  getAuthorization(id) { return this.get(`/v2/payments/authorizations/${id}`) }
  captureAuthorization(id, p) { return this.post(`/v2/payments/authorizations/${id}/capture`, p || {}) }
  reauthorize(id, p) { return this.post(`/v2/payments/authorizations/${id}/reauthorize`, p || {}) }
  voidAuthorization(id) { return this.post(`/v2/payments/authorizations/${id}/void`) }
  getCapture(id) { return this.get(`/v2/payments/captures/${id}`) }
  refundCapture(id, p) { return this.post(`/v2/payments/captures/${id}/refund`, p || {}) }
  getRefund(id) { return this.get(`/v2/payments/refunds/${id}`) }

  // ---------------------------------------------------------------------------
  // Payouts
  // ---------------------------------------------------------------------------

  createPayout(p) { return this.post('/v1/payments/payouts', p) }
  getPayout(id) { return this.get(`/v1/payments/payouts/${id}`) }
  getPayoutItem(id) { return this.get(`/v1/payments/payouts-item/${id}`) }
  cancelPayoutItem(id) { return this.post(`/v1/payments/payouts-item/${id}/cancel`) }

  // ---------------------------------------------------------------------------
  // Billing Plans
  // ---------------------------------------------------------------------------

  createPlan(p) { return this.post('/v1/billing/plans', p) }
  listPlans(q) { return this.get('/v1/billing/plans', q) }
  getPlan(id) { return this.get(`/v1/billing/plans/${id}`) }
  updatePlan(id, p) { return this.patch(`/v1/billing/plans/${id}`, p) }
  activatePlan(id) { return this.post(`/v1/billing/plans/${id}/activate`) }
  deactivatePlan(id) { return this.post(`/v1/billing/plans/${id}/deactivate`) }
  updatePlanPricing(id, p) { return this.post(`/v1/billing/plans/${id}/update-pricing-schemes`, p) }

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------

  createSubscription(p) { return this.post('/v1/billing/subscriptions', p) }
  getSubscription(id) { return this.get(`/v1/billing/subscriptions/${id}`) }
  updateSubscription(id, p) { return this.patch(`/v1/billing/subscriptions/${id}`, p) }
  reviseSubscription(id, p) { return this.post(`/v1/billing/subscriptions/${id}/revise`, p) }
  suspendSubscription(id, p) { return this.post(`/v1/billing/subscriptions/${id}/suspend`, p || { reason: 'Suspended via W3 workflow' }) }
  cancelSubscription(id, p) { return this.post(`/v1/billing/subscriptions/${id}/cancel`, p || { reason: 'Cancelled via W3 workflow' }) }
  activateSubscription(id, p) { return this.post(`/v1/billing/subscriptions/${id}/activate`, p || { reason: 'Reactivated via W3 workflow' }) }
  captureSubscription(id, p) { return this.post(`/v1/billing/subscriptions/${id}/capture`, p) }
  listSubscriptionTransactions(id, q) { return this.get(`/v1/billing/subscriptions/${id}/transactions`, q) }

  // ---------------------------------------------------------------------------
  // Invoicing
  // ---------------------------------------------------------------------------

  createInvoice(p) { return this.post('/v2/invoicing/invoices', p) }
  listInvoices(q) { return this.get('/v2/invoicing/invoices', q) }
  getInvoice(id) { return this.get(`/v2/invoicing/invoices/${id}`) }
  updateInvoice(id, p) { return this.put(`/v2/invoicing/invoices/${id}`, p) }
  deleteInvoice(id) { return this.delete(`/v2/invoicing/invoices/${id}`) }
  sendInvoice(id, p) { return this.post(`/v2/invoicing/invoices/${id}/send`, p || {}) }
  remindInvoice(id, p) { return this.post(`/v2/invoicing/invoices/${id}/remind`, p || {}) }
  cancelInvoice(id, p) { return this.post(`/v2/invoicing/invoices/${id}/cancel`, p || {}) }
  recordInvoicePayment(id, p) { return this.post(`/v2/invoicing/invoices/${id}/payments`, p) }
  deleteInvoicePayment(iid, pid) { return this.delete(`/v2/invoicing/invoices/${iid}/payments/${pid}`) }
  recordInvoiceRefund(id, p) { return this.post(`/v2/invoicing/invoices/${id}/refunds`, p) }
  generateInvoiceQr(id, p) { return this.post(`/v2/invoicing/invoices/${id}/generate-qr-code`, p || { width: 400, height: 400 }) }
  generateInvoiceNumber() { return this.post('/v2/invoicing/generate-next-invoice-number', {}) }
  searchInvoices(p) { return this.post('/v2/invoicing/search-invoices', p) }
  listInvoiceTemplates(q) { return this.get('/v2/invoicing/templates', q) }
  createInvoiceTemplate(p) { return this.post('/v2/invoicing/templates', p) }
  getInvoiceTemplate(id) { return this.get(`/v2/invoicing/templates/${id}`) }
  updateInvoiceTemplate(id, p) { return this.put(`/v2/invoicing/templates/${id}`, p) }
  deleteInvoiceTemplate(id) { return this.delete(`/v2/invoicing/templates/${id}`) }

  // ---------------------------------------------------------------------------
  // Disputes
  // ---------------------------------------------------------------------------

  listDisputes(q) { return this.get('/v1/customer/disputes', q) }
  getDispute(id) { return this.get(`/v1/customer/disputes/${id}`) }
  acceptDisputeClaim(id, p) { return this.post(`/v1/customer/disputes/${id}/accept-claim`, p || {}) }
  escalateDispute(id, p) { return this.post(`/v1/customer/disputes/${id}/escalate`, p || { note: 'Escalated via W3 workflow' }) }
  provideDisputeEvidence(id, p) { return this.post(`/v1/customer/disputes/${id}/provide-evidence`, p) }
  appealDispute(id, p) { return this.post(`/v1/customer/disputes/${id}/appeal`, p) }
  sendDisputeMessage(id, p) { return this.post(`/v1/customer/disputes/${id}/send-message`, p) }
  makeDisputeOffer(id, p) { return this.post(`/v1/customer/disputes/${id}/make-offer`, p) }
  acceptDisputeOffer(id, p) { return this.post(`/v1/customer/disputes/${id}/accept-offer`, p || {}) }
  denyDisputeOffer(id, p) { return this.post(`/v1/customer/disputes/${id}/deny-offer`, p || {}) }

  // ---------------------------------------------------------------------------
  // Vault / Payment Tokens
  // ---------------------------------------------------------------------------

  createSetupToken(p) { return this.post('/v3/vault/setup-tokens', p) }
  getSetupToken(id) { return this.get(`/v3/vault/setup-tokens/${id}`) }
  createPaymentToken(p) { return this.post('/v3/vault/payment-tokens', p) }
  listPaymentTokens(q) { return this.get('/v3/vault/payment-tokens', q) }
  getPaymentToken(id) { return this.get(`/v3/vault/payment-tokens/${id}`) }
  deletePaymentToken(id) { return this.delete(`/v3/vault/payment-tokens/${id}`) }

  // ---------------------------------------------------------------------------
  // Catalog Products
  // ---------------------------------------------------------------------------

  createProduct(p) { return this.post('/v1/catalogs/products', p) }
  listProducts(q) { return this.get('/v1/catalogs/products', q) }
  getProduct(id) { return this.get(`/v1/catalogs/products/${id}`) }
  updateProduct(id, p) { return this.patch(`/v1/catalogs/products/${id}`, p) }

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  searchTransactions(q) { return this.get('/v1/reporting/transactions', q) }
  getBalances(q) { return this.get('/v1/reporting/balances', q) }

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------

  createWebhook(p) { return this.post('/v1/notifications/webhooks', p) }
  listWebhooks() { return this.get('/v1/notifications/webhooks') }
  getWebhook(id) { return this.get(`/v1/notifications/webhooks/${id}`) }
  updateWebhook(id, p) { return this.patch(`/v1/notifications/webhooks/${id}`, p) }
  deleteWebhook(id) { return this.delete(`/v1/notifications/webhooks/${id}`) }
  listWebhookEventTypes() { return this.get('/v1/notifications/webhooks-event-types') }
  listWebhookEvents(q) { return this.get('/v1/notifications/webhooks-events', q) }
  getWebhookEvent(id) { return this.get(`/v1/notifications/webhooks-events/${id}`) }
  resendWebhookEvent(id, p) { return this.post(`/v1/notifications/webhooks-events/${id}/resend`, p || {}) }
  simulateWebhookEvent(p) { return this.post('/v1/notifications/simulate-event', p) }
  verifyWebhookSignature(p) { return this.post('/v1/notifications/verify-webhook-signature', p) }

  // ---------------------------------------------------------------------------
  // Crypto Onramp
  // ---------------------------------------------------------------------------

  createOnrampSession(p) { return this.post('/v1/crypto/onramp/sessions', p) }
  getOnrampSession(id) { return this.get(`/v1/crypto/onramp/sessions/${id}`) }
  getOnrampQuotes(q) { return this.get('/v1/crypto/onramp/quotes', q) }

  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------

  getUserInfo() { return this.get('/v1/identity/oauth2/userinfo', { schema: 'openid' }) }
}
