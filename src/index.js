import { createCommandRouter, setJsonOutput, handleError } from '@w3-io/action-core'
import * as core from '@actions/core'

// -- Shared helpers -----------------------------------------------------------

async function getAccessToken(apiUrl, clientId, clientSecret) {
  const tokenRes = await fetch(`${apiUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    throw new Error(
      `OAuth failed: ${tokenData.error_description || JSON.stringify(tokenData)}`,
    )
  }
  return tokenData.access_token
}

function makeRequest(apiUrl, headers) {
  return async function request(method, path, bodyObj, extraHeaders) {
    const url = `${apiUrl}${path}`
    const opts = { method, headers: { ...headers, ...extraHeaders } }
    if (
      bodyObj &&
      (method === 'POST' || method === 'PUT' || method === 'PATCH')
    ) {
      opts.body = JSON.stringify(bodyObj)
    }
    const res = await fetch(url, opts)
    if (res.status === 204) return { success: true }
    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
    if (!res.ok) {
      const msg = typeof data === 'object' ? JSON.stringify(data) : data
      throw new Error(`${method} ${path} returned ${res.status}: ${msg}`)
    }
    return data
  }
}

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== '')
  return entries.length
    ? '?' + entries.map(([k, v]) => `${k}=${v}`).join('&')
    : ''
}

function parseBody() {
  const body = core.getInput('body') || ''
  if (!body) throw new Error('body input is required for this command')
  return JSON.parse(body)
}

async function setup() {
  const clientId = core.getInput('client-id', { required: true })
  const clientSecret = core.getInput('client-secret', { required: true })
  const apiUrl = core.getInput('api-url') || 'https://api-m.sandbox.paypal.com'

  const token = await getAccessToken(apiUrl, clientId, clientSecret)
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  return makeRequest(apiUrl, headers)
}

function handler(fn) {
  return async () => {
    const request = await setup()
    const result = await fn(request)
    setJsonOutput('result', result)
  }
}

// -- Router -------------------------------------------------------------------

const router = createCommandRouter({
  // =================================================================
  // ORDERS
  // =================================================================

  'create-order': handler(async (request) => {
    return request('POST', '/v2/checkout/orders', parseBody())
  }),

  'get-order': handler(async (request) => {
    const orderId = core.getInput('order-id') || ''
    if (!orderId) throw new Error('order-id is required')
    return request('GET', `/v2/checkout/orders/${orderId}`)
  }),

  'update-order': handler(async (request) => {
    const orderId = core.getInput('order-id') || ''
    if (!orderId) throw new Error('order-id is required')
    return request('PATCH', `/v2/checkout/orders/${orderId}`, parseBody())
  }),

  'authorize-order': handler(async (request) => {
    const orderId = core.getInput('order-id') || ''
    const body = core.getInput('body') || ''
    if (!orderId) throw new Error('order-id is required')
    return request('POST', `/v2/checkout/orders/${orderId}/authorize`, body ? JSON.parse(body) : {})
  }),

  'capture-order': handler(async (request) => {
    const orderId = core.getInput('order-id') || ''
    const body = core.getInput('body') || ''
    if (!orderId) throw new Error('order-id is required')
    return request('POST', `/v2/checkout/orders/${orderId}/capture`, body ? JSON.parse(body) : {})
  }),

  'confirm-order': handler(async (request) => {
    const orderId = core.getInput('order-id') || ''
    if (!orderId) throw new Error('order-id is required')
    return request('POST', `/v2/checkout/orders/${orderId}/confirm-payment-source`, parseBody())
  }),

  'track-order': handler(async (request) => {
    const orderId = core.getInput('order-id') || ''
    if (!orderId) throw new Error('order-id is required')
    return request('POST', `/v2/checkout/orders/${orderId}/track`, parseBody())
  }),

  'update-order-tracking': handler(async (request) => {
    const orderId = core.getInput('order-id') || ''
    const trackerId = core.getInput('tracker-id') || ''
    if (!orderId) throw new Error('order-id is required')
    if (!trackerId) throw new Error('tracker-id is required')
    return request('PATCH', `/v2/checkout/orders/${orderId}/trackers/${trackerId}`, parseBody())
  }),

  // =================================================================
  // PAYMENTS (post-order lifecycle)
  // =================================================================

  'get-authorization': handler(async (request) => {
    const authorizationId = core.getInput('authorization-id') || ''
    if (!authorizationId) throw new Error('authorization-id is required')
    return request('GET', `/v2/payments/authorizations/${authorizationId}`)
  }),

  'capture-authorization': handler(async (request) => {
    const authorizationId = core.getInput('authorization-id') || ''
    const body = core.getInput('body') || ''
    if (!authorizationId) throw new Error('authorization-id is required')
    return request('POST', `/v2/payments/authorizations/${authorizationId}/capture`, body ? JSON.parse(body) : {})
  }),

  reauthorize: handler(async (request) => {
    const authorizationId = core.getInput('authorization-id') || ''
    const body = core.getInput('body') || ''
    if (!authorizationId) throw new Error('authorization-id is required')
    return request('POST', `/v2/payments/authorizations/${authorizationId}/reauthorize`, body ? JSON.parse(body) : {})
  }),

  'void-authorization': handler(async (request) => {
    const authorizationId = core.getInput('authorization-id') || ''
    if (!authorizationId) throw new Error('authorization-id is required')
    return request('POST', `/v2/payments/authorizations/${authorizationId}/void`)
  }),

  'get-capture': handler(async (request) => {
    const captureId = core.getInput('capture-id') || ''
    if (!captureId) throw new Error('capture-id is required')
    return request('GET', `/v2/payments/captures/${captureId}`)
  }),

  'refund-capture': handler(async (request) => {
    const captureId = core.getInput('capture-id') || ''
    const body = core.getInput('body') || ''
    if (!captureId) throw new Error('capture-id is required')
    return request('POST', `/v2/payments/captures/${captureId}/refund`, body ? JSON.parse(body) : {})
  }),

  'get-refund': handler(async (request) => {
    const refundId = core.getInput('refund-id') || ''
    if (!refundId) throw new Error('refund-id is required')
    return request('GET', `/v2/payments/refunds/${refundId}`)
  }),

  // =================================================================
  // PAYOUTS
  // =================================================================

  'create-payout': handler(async (request) => {
    return request('POST', '/v1/payments/payouts', parseBody())
  }),

  'get-payout': handler(async (request) => {
    const payoutId = core.getInput('payout-id') || ''
    if (!payoutId) throw new Error('payout-id is required')
    return request('GET', `/v1/payments/payouts/${payoutId}`)
  }),

  'get-payout-item': handler(async (request) => {
    const itemId = core.getInput('item-id') || ''
    if (!itemId) throw new Error('item-id is required')
    return request('GET', `/v1/payments/payouts-item/${itemId}`)
  }),

  'cancel-payout-item': handler(async (request) => {
    const itemId = core.getInput('item-id') || ''
    if (!itemId) throw new Error('item-id is required')
    return request('POST', `/v1/payments/payouts-item/${itemId}/cancel`)
  }),

  // =================================================================
  // SUBSCRIPTIONS -- Plans
  // =================================================================

  'create-plan': handler(async (request) => {
    return request('POST', '/v1/billing/plans', parseBody())
  }),

  'list-plans': handler(async (request) => {
    const pageSize = core.getInput('page-size') || ''
    const page = core.getInput('page') || ''
    const totalRequired = core.getInput('total-required') || ''
    return request('GET', `/v1/billing/plans${qs({ page_size: pageSize, page, total_required: totalRequired })}`)
  }),

  'get-plan': handler(async (request) => {
    const planId = core.getInput('plan-id') || ''
    if (!planId) throw new Error('plan-id is required')
    return request('GET', `/v1/billing/plans/${planId}`)
  }),

  'update-plan': handler(async (request) => {
    const planId = core.getInput('plan-id') || ''
    if (!planId) throw new Error('plan-id is required')
    return request('PATCH', `/v1/billing/plans/${planId}`, parseBody())
  }),

  'activate-plan': handler(async (request) => {
    const planId = core.getInput('plan-id') || ''
    if (!planId) throw new Error('plan-id is required')
    return request('POST', `/v1/billing/plans/${planId}/activate`)
  }),

  'deactivate-plan': handler(async (request) => {
    const planId = core.getInput('plan-id') || ''
    if (!planId) throw new Error('plan-id is required')
    return request('POST', `/v1/billing/plans/${planId}/deactivate`)
  }),

  'update-plan-pricing': handler(async (request) => {
    const planId = core.getInput('plan-id') || ''
    if (!planId) throw new Error('plan-id is required')
    return request('POST', `/v1/billing/plans/${planId}/update-pricing-schemes`, parseBody())
  }),

  // =================================================================
  // SUBSCRIPTIONS -- Subscriptions
  // =================================================================

  'create-subscription': handler(async (request) => {
    return request('POST', '/v1/billing/subscriptions', parseBody())
  }),

  'get-subscription': handler(async (request) => {
    const subscriptionId = core.getInput('subscription-id') || ''
    if (!subscriptionId) throw new Error('subscription-id is required')
    return request('GET', `/v1/billing/subscriptions/${subscriptionId}`)
  }),

  'update-subscription': handler(async (request) => {
    const subscriptionId = core.getInput('subscription-id') || ''
    if (!subscriptionId) throw new Error('subscription-id is required')
    return request('PATCH', `/v1/billing/subscriptions/${subscriptionId}`, parseBody())
  }),

  'revise-subscription': handler(async (request) => {
    const subscriptionId = core.getInput('subscription-id') || ''
    if (!subscriptionId) throw new Error('subscription-id is required')
    return request('POST', `/v1/billing/subscriptions/${subscriptionId}/revise`, parseBody())
  }),

  'suspend-subscription': handler(async (request) => {
    const subscriptionId = core.getInput('subscription-id') || ''
    const body = core.getInput('body') || ''
    if (!subscriptionId) throw new Error('subscription-id is required')
    return request('POST', `/v1/billing/subscriptions/${subscriptionId}/suspend`, body ? JSON.parse(body) : { reason: 'Suspended via W3 workflow' })
  }),

  'cancel-subscription': handler(async (request) => {
    const subscriptionId = core.getInput('subscription-id') || ''
    const body = core.getInput('body') || ''
    if (!subscriptionId) throw new Error('subscription-id is required')
    return request('POST', `/v1/billing/subscriptions/${subscriptionId}/cancel`, body ? JSON.parse(body) : { reason: 'Cancelled via W3 workflow' })
  }),

  'activate-subscription': handler(async (request) => {
    const subscriptionId = core.getInput('subscription-id') || ''
    const body = core.getInput('body') || ''
    if (!subscriptionId) throw new Error('subscription-id is required')
    return request('POST', `/v1/billing/subscriptions/${subscriptionId}/activate`, body ? JSON.parse(body) : { reason: 'Reactivated via W3 workflow' })
  }),

  'capture-subscription': handler(async (request) => {
    const subscriptionId = core.getInput('subscription-id') || ''
    if (!subscriptionId) throw new Error('subscription-id is required')
    return request('POST', `/v1/billing/subscriptions/${subscriptionId}/capture`, parseBody())
  }),

  'list-subscription-transactions': handler(async (request) => {
    const subscriptionId = core.getInput('subscription-id') || ''
    const startDate = core.getInput('start-date') || ''
    const endDate = core.getInput('end-date') || ''
    if (!subscriptionId) throw new Error('subscription-id is required')
    return request('GET', `/v1/billing/subscriptions/${subscriptionId}/transactions${qs({ start_time: startDate, end_time: endDate })}`)
  }),

  // =================================================================
  // INVOICING
  // =================================================================

  'create-invoice': handler(async (request) => {
    return request('POST', '/v2/invoicing/invoices', parseBody())
  }),

  'list-invoices': handler(async (request) => {
    const page = core.getInput('page') || ''
    const pageSize = core.getInput('page-size') || ''
    const totalRequired = core.getInput('total-required') || ''
    const fields = core.getInput('fields') || ''
    return request('GET', `/v2/invoicing/invoices${qs({ page, page_size: pageSize, total_required: totalRequired, fields })}`)
  }),

  'get-invoice': handler(async (request) => {
    const invoiceId = core.getInput('invoice-id') || ''
    if (!invoiceId) throw new Error('invoice-id is required')
    return request('GET', `/v2/invoicing/invoices/${invoiceId}`)
  }),

  'update-invoice': handler(async (request) => {
    const invoiceId = core.getInput('invoice-id') || ''
    if (!invoiceId) throw new Error('invoice-id is required')
    return request('PUT', `/v2/invoicing/invoices/${invoiceId}`, parseBody())
  }),

  'delete-invoice': handler(async (request) => {
    const invoiceId = core.getInput('invoice-id') || ''
    if (!invoiceId) throw new Error('invoice-id is required')
    return request('DELETE', `/v2/invoicing/invoices/${invoiceId}`)
  }),

  'send-invoice': handler(async (request) => {
    const invoiceId = core.getInput('invoice-id') || ''
    const body = core.getInput('body') || ''
    if (!invoiceId) throw new Error('invoice-id is required')
    return request('POST', `/v2/invoicing/invoices/${invoiceId}/send`, body ? JSON.parse(body) : {})
  }),

  'remind-invoice': handler(async (request) => {
    const invoiceId = core.getInput('invoice-id') || ''
    const body = core.getInput('body') || ''
    if (!invoiceId) throw new Error('invoice-id is required')
    return request('POST', `/v2/invoicing/invoices/${invoiceId}/remind`, body ? JSON.parse(body) : {})
  }),

  'cancel-invoice': handler(async (request) => {
    const invoiceId = core.getInput('invoice-id') || ''
    const body = core.getInput('body') || ''
    if (!invoiceId) throw new Error('invoice-id is required')
    return request('POST', `/v2/invoicing/invoices/${invoiceId}/cancel`, body ? JSON.parse(body) : {})
  }),

  'record-invoice-payment': handler(async (request) => {
    const invoiceId = core.getInput('invoice-id') || ''
    if (!invoiceId) throw new Error('invoice-id is required')
    return request('POST', `/v2/invoicing/invoices/${invoiceId}/payments`, parseBody())
  }),

  'delete-invoice-payment': handler(async (request) => {
    const invoiceId = core.getInput('invoice-id') || ''
    const paymentId = core.getInput('payment-id') || ''
    if (!invoiceId) throw new Error('invoice-id is required')
    if (!paymentId) throw new Error('payment-id is required')
    return request('DELETE', `/v2/invoicing/invoices/${invoiceId}/payments/${paymentId}`)
  }),

  'record-invoice-refund': handler(async (request) => {
    const invoiceId = core.getInput('invoice-id') || ''
    if (!invoiceId) throw new Error('invoice-id is required')
    return request('POST', `/v2/invoicing/invoices/${invoiceId}/refunds`, parseBody())
  }),

  'generate-invoice-qr': handler(async (request) => {
    const invoiceId = core.getInput('invoice-id') || ''
    const body = core.getInput('body') || ''
    if (!invoiceId) throw new Error('invoice-id is required')
    return request('POST', `/v2/invoicing/invoices/${invoiceId}/generate-qr-code`, body ? JSON.parse(body) : { width: 400, height: 400 })
  }),

  'generate-invoice-number': handler(async (request) => {
    return request('POST', '/v2/invoicing/generate-next-invoice-number', {})
  }),

  'search-invoices': handler(async (request) => {
    return request('POST', '/v2/invoicing/search-invoices', parseBody())
  }),

  // Invoice templates
  'list-invoice-templates': handler(async (request) => {
    const page = core.getInput('page') || ''
    const pageSize = core.getInput('page-size') || ''
    const fields = core.getInput('fields') || ''
    return request('GET', `/v2/invoicing/templates${qs({ page, page_size: pageSize, fields })}`)
  }),

  'create-invoice-template': handler(async (request) => {
    return request('POST', '/v2/invoicing/templates', parseBody())
  }),

  'get-invoice-template': handler(async (request) => {
    const templateId = core.getInput('template-id') || ''
    if (!templateId) throw new Error('template-id is required')
    return request('GET', `/v2/invoicing/templates/${templateId}`)
  }),

  'update-invoice-template': handler(async (request) => {
    const templateId = core.getInput('template-id') || ''
    if (!templateId) throw new Error('template-id is required')
    return request('PUT', `/v2/invoicing/templates/${templateId}`, parseBody())
  }),

  'delete-invoice-template': handler(async (request) => {
    const templateId = core.getInput('template-id') || ''
    if (!templateId) throw new Error('template-id is required')
    return request('DELETE', `/v2/invoicing/templates/${templateId}`)
  }),

  // =================================================================
  // DISPUTES
  // =================================================================

  'list-disputes': handler(async (request) => {
    const startDate = core.getInput('start-date') || ''
    const status = core.getInput('status') || ''
    const pageSize = core.getInput('page-size') || ''
    return request('GET', `/v1/customer/disputes${qs({ start_time: startDate, dispute_state: status, page_size: pageSize })}`)
  }),

  'get-dispute': handler(async (request) => {
    const disputeId = core.getInput('dispute-id') || ''
    if (!disputeId) throw new Error('dispute-id is required')
    return request('GET', `/v1/customer/disputes/${disputeId}`)
  }),

  'accept-dispute-claim': handler(async (request) => {
    const disputeId = core.getInput('dispute-id') || ''
    const body = core.getInput('body') || ''
    if (!disputeId) throw new Error('dispute-id is required')
    return request('POST', `/v1/customer/disputes/${disputeId}/accept-claim`, body ? JSON.parse(body) : {})
  }),

  'escalate-dispute': handler(async (request) => {
    const disputeId = core.getInput('dispute-id') || ''
    const body = core.getInput('body') || ''
    if (!disputeId) throw new Error('dispute-id is required')
    return request('POST', `/v1/customer/disputes/${disputeId}/escalate`, body ? JSON.parse(body) : { note: 'Escalated via W3 workflow' })
  }),

  'provide-dispute-evidence': handler(async (request) => {
    const disputeId = core.getInput('dispute-id') || ''
    if (!disputeId) throw new Error('dispute-id is required')
    return request('POST', `/v1/customer/disputes/${disputeId}/provide-evidence`, parseBody())
  }),

  'appeal-dispute': handler(async (request) => {
    const disputeId = core.getInput('dispute-id') || ''
    if (!disputeId) throw new Error('dispute-id is required')
    return request('POST', `/v1/customer/disputes/${disputeId}/appeal`, parseBody())
  }),

  'send-dispute-message': handler(async (request) => {
    const disputeId = core.getInput('dispute-id') || ''
    if (!disputeId) throw new Error('dispute-id is required')
    return request('POST', `/v1/customer/disputes/${disputeId}/send-message`, parseBody())
  }),

  'make-dispute-offer': handler(async (request) => {
    const disputeId = core.getInput('dispute-id') || ''
    if (!disputeId) throw new Error('dispute-id is required')
    return request('POST', `/v1/customer/disputes/${disputeId}/make-offer`, parseBody())
  }),

  'accept-dispute-offer': handler(async (request) => {
    const disputeId = core.getInput('dispute-id') || ''
    const body = core.getInput('body') || ''
    if (!disputeId) throw new Error('dispute-id is required')
    return request('POST', `/v1/customer/disputes/${disputeId}/accept-offer`, body ? JSON.parse(body) : {})
  }),

  'deny-dispute-offer': handler(async (request) => {
    const disputeId = core.getInput('dispute-id') || ''
    const body = core.getInput('body') || ''
    if (!disputeId) throw new Error('dispute-id is required')
    return request('POST', `/v1/customer/disputes/${disputeId}/deny-offer`, body ? JSON.parse(body) : {})
  }),

  // =================================================================
  // VAULT / PAYMENT TOKENS
  // =================================================================

  'create-setup-token': handler(async (request) => {
    return request('POST', '/v3/vault/setup-tokens', parseBody())
  }),

  'get-setup-token': handler(async (request) => {
    const tokenId = core.getInput('token-id') || ''
    if (!tokenId) throw new Error('token-id is required')
    return request('GET', `/v3/vault/setup-tokens/${tokenId}`)
  }),

  'create-payment-token': handler(async (request) => {
    return request('POST', '/v3/vault/payment-tokens', parseBody())
  }),

  'list-payment-tokens': handler(async (request) => {
    return request('GET', `/v3/vault/payment-tokens${qs({ customer_id: core.getInput('customer-id') || '' })}`)
  }),

  'get-payment-token': handler(async (request) => {
    const tokenId = core.getInput('token-id') || ''
    if (!tokenId) throw new Error('token-id is required')
    return request('GET', `/v3/vault/payment-tokens/${tokenId}`)
  }),

  'delete-payment-token': handler(async (request) => {
    const tokenId = core.getInput('token-id') || ''
    if (!tokenId) throw new Error('token-id is required')
    return request('DELETE', `/v3/vault/payment-tokens/${tokenId}`)
  }),

  // =================================================================
  // CATALOG PRODUCTS
  // =================================================================

  'create-product': handler(async (request) => {
    return request('POST', '/v1/catalogs/products', parseBody())
  }),

  'list-products': handler(async (request) => {
    const pageSize = core.getInput('page-size') || ''
    const page = core.getInput('page') || ''
    const totalRequired = core.getInput('total-required') || ''
    return request('GET', `/v1/catalogs/products${qs({ page_size: pageSize, page, total_required: totalRequired })}`)
  }),

  'get-product': handler(async (request) => {
    const productId = core.getInput('product-id') || ''
    if (!productId) throw new Error('product-id is required')
    return request('GET', `/v1/catalogs/products/${productId}`)
  }),

  'update-product': handler(async (request) => {
    const productId = core.getInput('product-id') || ''
    if (!productId) throw new Error('product-id is required')
    return request('PATCH', `/v1/catalogs/products/${productId}`, parseBody())
  }),

  // =================================================================
  // REPORTING
  // =================================================================

  'search-transactions': handler(async (request) => {
    const startDate = core.getInput('start-date') || ''
    const endDate = core.getInput('end-date') || ''
    const transactionId = core.getInput('transaction-id') || ''
    const transactionType = core.getInput('transaction-type') || ''
    const transactionStatus = core.getInput('transaction-status') || ''
    const transactionAmount = core.getInput('transaction-amount') || ''
    const currencyCode = core.getInput('currency-code') || ''
    const pageSize = core.getInput('page-size') || ''
    const page = core.getInput('page') || ''
    const fields = core.getInput('fields') || ''
    return request('GET', `/v1/reporting/transactions${qs({
      start_date: startDate,
      end_date: endDate,
      transaction_id: transactionId,
      transaction_type: transactionType,
      transaction_status: transactionStatus,
      transaction_amount: transactionAmount,
      currency_code: currencyCode,
      page_size: pageSize,
      page,
      fields,
    })}`)
  }),

  'get-balances': handler(async (request) => {
    const balanceDate = core.getInput('balance-date') || ''
    const currencyCode = core.getInput('currency-code') || ''
    return request('GET', `/v1/reporting/balances${qs({ as_of_time: balanceDate, currency_code: currencyCode })}`)
  }),

  // =================================================================
  // WEBHOOKS
  // =================================================================

  'create-webhook': handler(async (request) => {
    return request('POST', '/v1/notifications/webhooks', parseBody())
  }),

  'list-webhooks': handler(async (request) => {
    return request('GET', '/v1/notifications/webhooks')
  }),

  'get-webhook': handler(async (request) => {
    const webhookId = core.getInput('webhook-id') || ''
    if (!webhookId) throw new Error('webhook-id is required')
    return request('GET', `/v1/notifications/webhooks/${webhookId}`)
  }),

  'update-webhook': handler(async (request) => {
    const webhookId = core.getInput('webhook-id') || ''
    if (!webhookId) throw new Error('webhook-id is required')
    return request('PATCH', `/v1/notifications/webhooks/${webhookId}`, parseBody())
  }),

  'delete-webhook': handler(async (request) => {
    const webhookId = core.getInput('webhook-id') || ''
    if (!webhookId) throw new Error('webhook-id is required')
    return request('DELETE', `/v1/notifications/webhooks/${webhookId}`)
  }),

  'list-webhook-event-types': handler(async (request) => {
    return request('GET', '/v1/notifications/webhooks-event-types')
  }),

  'list-webhook-events': handler(async (request) => {
    const startDate = core.getInput('start-date') || ''
    const endDate = core.getInput('end-date') || ''
    const pageSize = core.getInput('page-size') || ''
    const eventType = core.getInput('event-type') || ''
    return request('GET', `/v1/notifications/webhooks-events${qs({ start_time: startDate, end_time: endDate, page_size: pageSize, event_type: eventType })}`)
  }),

  'get-webhook-event': handler(async (request) => {
    const eventId = core.getInput('event-id') || ''
    if (!eventId) throw new Error('event-id is required')
    return request('GET', `/v1/notifications/webhooks-events/${eventId}`)
  }),

  'resend-webhook-event': handler(async (request) => {
    const eventId = core.getInput('event-id') || ''
    const body = core.getInput('body') || ''
    if (!eventId) throw new Error('event-id is required')
    return request('POST', `/v1/notifications/webhooks-events/${eventId}/resend`, body ? JSON.parse(body) : {})
  }),

  'simulate-webhook-event': handler(async (request) => {
    return request('POST', '/v1/notifications/simulate-event', parseBody())
  }),

  'verify-webhook-signature': handler(async (request) => {
    return request('POST', '/v1/notifications/verify-webhook-signature', parseBody())
  }),

  // =================================================================
  // IDENTITY
  // =================================================================

  'get-userinfo': handler(async (request) => {
    return request('GET', '/v1/identity/oauth2/userinfo?schema=openid')
  }),
})

router()
