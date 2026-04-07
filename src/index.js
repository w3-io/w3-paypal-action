/**
 * W3 PayPal Action — 91 commands across 12 categories.
 *
 * Orders, payments, payouts, subscriptions, invoicing, disputes,
 * vault, catalog products, reporting, webhooks, crypto onramp,
 * and identity.
 */

import { createCommandRouter, setJsonOutput, W3ActionError } from '@w3-io/action-core'
import * as core from '@actions/core'
import { PayPalClient } from './client.js'

function getClient() {
  return new PayPalClient({
    clientId: core.getInput('client-id', { required: true }),
    clientSecret: core.getInput('client-secret', { required: true }),
    baseUrl: core.getInput('api-url') || undefined,
  })
}

function jsonInput(name) {
  const raw = core.getInput(name)
  if (!raw) return undefined
  try {
    return JSON.parse(raw)
  } catch (e) {
    throw new W3ActionError('INVALID_JSON', `Input '${name}' is not valid JSON: ${e.message}`)
  }
}

function req(name) { return core.getInput(name, { required: true }) }
function opt(name) { return core.getInput(name) || undefined }

/** Build query params from optional inputs.
 *  Accepts [inputName, apiName] tuples for non-standard param names,
 *  or plain strings (kebab → snake_case). */
function query(...specs) {
  const q = {}
  for (const spec of specs) {
    const [inputName, apiName] = Array.isArray(spec) ? spec : [spec, spec.replace(/-/g, '_')]
    const v = core.getInput(inputName)
    if (v) q[apiName] = v
  }
  return Object.keys(q).length ? q : undefined
}

const router = createCommandRouter({
  // ── Orders ──────────────────────────────────────────────────────────
  'create-order': async () => setJsonOutput('result', await getClient().createOrder(jsonInput('body'))),
  'get-order': async () => setJsonOutput('result', await getClient().getOrder(req('order-id'))),
  'update-order': async () => setJsonOutput('result', await getClient().updateOrder(req('order-id'), jsonInput('body'))),
  'authorize-order': async () => setJsonOutput('result', await getClient().authorizeOrder(req('order-id'), jsonInput('body'))),
  'capture-order': async () => setJsonOutput('result', await getClient().captureOrder(req('order-id'), jsonInput('body'))),
  'confirm-order': async () => setJsonOutput('result', await getClient().confirmOrder(req('order-id'), jsonInput('body'))),
  'track-order': async () => setJsonOutput('result', await getClient().trackOrder(req('order-id'), jsonInput('body'))),
  'update-order-tracking': async () => setJsonOutput('result', await getClient().updateOrderTracking(req('order-id'), req('tracker-id'), jsonInput('body'))),

  // ── Payments ────────────────────────────────────────────────────────
  'get-authorization': async () => setJsonOutput('result', await getClient().getAuthorization(req('authorization-id'))),
  'capture-authorization': async () => setJsonOutput('result', await getClient().captureAuthorization(req('authorization-id'), jsonInput('body'))),
  'reauthorize': async () => setJsonOutput('result', await getClient().reauthorize(req('authorization-id'), jsonInput('body'))),
  'void-authorization': async () => setJsonOutput('result', await getClient().voidAuthorization(req('authorization-id'))),
  'get-capture': async () => setJsonOutput('result', await getClient().getCapture(req('capture-id'))),
  'refund-capture': async () => setJsonOutput('result', await getClient().refundCapture(req('capture-id'), jsonInput('body'))),
  'get-refund': async () => setJsonOutput('result', await getClient().getRefund(req('refund-id'))),

  // ── Payouts ─────────────────────────────────────────────────────────
  'create-payout': async () => setJsonOutput('result', await getClient().createPayout(jsonInput('body'))),
  'get-payout': async () => setJsonOutput('result', await getClient().getPayout(req('payout-id'))),
  'get-payout-item': async () => setJsonOutput('result', await getClient().getPayoutItem(req('item-id'))),
  'cancel-payout-item': async () => setJsonOutput('result', await getClient().cancelPayoutItem(req('item-id'))),

  // ── Billing Plans ───────────────────────────────────────────────────
  'create-plan': async () => setJsonOutput('result', await getClient().createPlan(jsonInput('body'))),
  'list-plans': async () => setJsonOutput('result', await getClient().listPlans(query('page-size', 'page', 'total-required'))),
  'get-plan': async () => setJsonOutput('result', await getClient().getPlan(req('plan-id'))),
  'update-plan': async () => setJsonOutput('result', await getClient().updatePlan(req('plan-id'), jsonInput('body'))),
  'activate-plan': async () => setJsonOutput('result', await getClient().activatePlan(req('plan-id'))),
  'deactivate-plan': async () => setJsonOutput('result', await getClient().deactivatePlan(req('plan-id'))),
  'update-plan-pricing': async () => setJsonOutput('result', await getClient().updatePlanPricing(req('plan-id'), jsonInput('body'))),

  // ── Subscriptions ───────────────────────────────────────────────────
  'create-subscription': async () => setJsonOutput('result', await getClient().createSubscription(jsonInput('body'))),
  'get-subscription': async () => setJsonOutput('result', await getClient().getSubscription(req('subscription-id'))),
  'update-subscription': async () => setJsonOutput('result', await getClient().updateSubscription(req('subscription-id'), jsonInput('body'))),
  'revise-subscription': async () => setJsonOutput('result', await getClient().reviseSubscription(req('subscription-id'), jsonInput('body'))),
  'suspend-subscription': async () => setJsonOutput('result', await getClient().suspendSubscription(req('subscription-id'), jsonInput('body'))),
  'cancel-subscription': async () => setJsonOutput('result', await getClient().cancelSubscription(req('subscription-id'), jsonInput('body'))),
  'activate-subscription': async () => setJsonOutput('result', await getClient().activateSubscription(req('subscription-id'), jsonInput('body'))),
  'capture-subscription': async () => setJsonOutput('result', await getClient().captureSubscription(req('subscription-id'), jsonInput('body'))),
  'list-subscription-transactions': async () => setJsonOutput('result', await getClient().listSubscriptionTransactions(req('subscription-id'), query(['start-date', 'start_time'], ['end-date', 'end_time']))),

  // ── Invoicing ───────────────────────────────────────────────────────
  'create-invoice': async () => setJsonOutput('result', await getClient().createInvoice(jsonInput('body'))),
  'list-invoices': async () => setJsonOutput('result', await getClient().listInvoices(query('page', 'page-size', 'total-required', 'fields'))),
  'get-invoice': async () => setJsonOutput('result', await getClient().getInvoice(req('invoice-id'))),
  'update-invoice': async () => setJsonOutput('result', await getClient().updateInvoice(req('invoice-id'), jsonInput('body'))),
  'delete-invoice': async () => setJsonOutput('result', await getClient().deleteInvoice(req('invoice-id'))),
  'send-invoice': async () => setJsonOutput('result', await getClient().sendInvoice(req('invoice-id'), jsonInput('body'))),
  'remind-invoice': async () => setJsonOutput('result', await getClient().remindInvoice(req('invoice-id'), jsonInput('body'))),
  'cancel-invoice': async () => setJsonOutput('result', await getClient().cancelInvoice(req('invoice-id'), jsonInput('body'))),
  'record-invoice-payment': async () => setJsonOutput('result', await getClient().recordInvoicePayment(req('invoice-id'), jsonInput('body'))),
  'delete-invoice-payment': async () => setJsonOutput('result', await getClient().deleteInvoicePayment(req('invoice-id'), req('payment-id'))),
  'record-invoice-refund': async () => setJsonOutput('result', await getClient().recordInvoiceRefund(req('invoice-id'), jsonInput('body'))),
  'generate-invoice-qr': async () => setJsonOutput('result', await getClient().generateInvoiceQr(req('invoice-id'), jsonInput('body'))),
  'generate-invoice-number': async () => setJsonOutput('result', await getClient().generateInvoiceNumber()),
  'search-invoices': async () => setJsonOutput('result', await getClient().searchInvoices(jsonInput('body'))),
  'list-invoice-templates': async () => setJsonOutput('result', await getClient().listInvoiceTemplates(query('page', 'page-size', 'fields'))),
  'create-invoice-template': async () => setJsonOutput('result', await getClient().createInvoiceTemplate(jsonInput('body'))),
  'get-invoice-template': async () => setJsonOutput('result', await getClient().getInvoiceTemplate(req('template-id'))),
  'update-invoice-template': async () => setJsonOutput('result', await getClient().updateInvoiceTemplate(req('template-id'), jsonInput('body'))),
  'delete-invoice-template': async () => setJsonOutput('result', await getClient().deleteInvoiceTemplate(req('template-id'))),

  // ── Disputes ────────────────────────────────────────────────────────
  'list-disputes': async () => setJsonOutput('result', await getClient().listDisputes(query(['start-date', 'start_time'], ['status', 'dispute_state'], 'page-size'))),
  'get-dispute': async () => setJsonOutput('result', await getClient().getDispute(req('dispute-id'))),
  'accept-dispute-claim': async () => setJsonOutput('result', await getClient().acceptDisputeClaim(req('dispute-id'), jsonInput('body'))),
  'escalate-dispute': async () => setJsonOutput('result', await getClient().escalateDispute(req('dispute-id'), jsonInput('body'))),
  'provide-dispute-evidence': async () => setJsonOutput('result', await getClient().provideDisputeEvidence(req('dispute-id'), jsonInput('body'))),
  'appeal-dispute': async () => setJsonOutput('result', await getClient().appealDispute(req('dispute-id'), jsonInput('body'))),
  'send-dispute-message': async () => setJsonOutput('result', await getClient().sendDisputeMessage(req('dispute-id'), jsonInput('body'))),
  'make-dispute-offer': async () => setJsonOutput('result', await getClient().makeDisputeOffer(req('dispute-id'), jsonInput('body'))),
  'accept-dispute-offer': async () => setJsonOutput('result', await getClient().acceptDisputeOffer(req('dispute-id'), jsonInput('body'))),
  'deny-dispute-offer': async () => setJsonOutput('result', await getClient().denyDisputeOffer(req('dispute-id'), jsonInput('body'))),

  // ── Vault / Payment Tokens ──────────────────────────────────────────
  'create-setup-token': async () => setJsonOutput('result', await getClient().createSetupToken(jsonInput('body'))),
  'get-setup-token': async () => setJsonOutput('result', await getClient().getSetupToken(req('token-id'))),
  'create-payment-token': async () => setJsonOutput('result', await getClient().createPaymentToken(jsonInput('body'))),
  'list-payment-tokens': async () => setJsonOutput('result', await getClient().listPaymentTokens(query('customer-id'))),
  'get-payment-token': async () => setJsonOutput('result', await getClient().getPaymentToken(req('token-id'))),
  'delete-payment-token': async () => setJsonOutput('result', await getClient().deletePaymentToken(req('token-id'))),

  // ── Catalog Products ────────────────────────────────────────────────
  'create-product': async () => setJsonOutput('result', await getClient().createProduct(jsonInput('body'))),
  'list-products': async () => setJsonOutput('result', await getClient().listProducts(query('page-size', 'page', 'total-required'))),
  'get-product': async () => setJsonOutput('result', await getClient().getProduct(req('product-id'))),
  'update-product': async () => setJsonOutput('result', await getClient().updateProduct(req('product-id'), jsonInput('body'))),

  // ── Reporting ───────────────────────────────────────────────────────
  'search-transactions': async () => setJsonOutput('result', await getClient().searchTransactions(
    query('start-date', 'end-date', 'transaction-id', 'transaction-type', 'transaction-status', 'transaction-amount', 'currency-code', 'page-size', 'page', 'fields'),
  )),
  'get-balances': async () => setJsonOutput('result', await getClient().getBalances(query(['balance-date', 'as_of_time'], 'currency-code'))),

  // ── Webhooks ────────────────────────────────────────────────────────
  'create-webhook': async () => setJsonOutput('result', await getClient().createWebhook(jsonInput('body'))),
  'list-webhooks': async () => setJsonOutput('result', await getClient().listWebhooks()),
  'get-webhook': async () => setJsonOutput('result', await getClient().getWebhook(req('webhook-id'))),
  'update-webhook': async () => setJsonOutput('result', await getClient().updateWebhook(req('webhook-id'), jsonInput('body'))),
  'delete-webhook': async () => setJsonOutput('result', await getClient().deleteWebhook(req('webhook-id'))),
  'list-webhook-event-types': async () => setJsonOutput('result', await getClient().listWebhookEventTypes()),
  'list-webhook-events': async () => setJsonOutput('result', await getClient().listWebhookEvents(query(['start-date', 'start_time'], ['end-date', 'end_time'], 'page-size', 'event-type'))),
  'get-webhook-event': async () => setJsonOutput('result', await getClient().getWebhookEvent(req('event-id'))),
  'resend-webhook-event': async () => setJsonOutput('result', await getClient().resendWebhookEvent(req('event-id'), jsonInput('body'))),
  'simulate-webhook-event': async () => setJsonOutput('result', await getClient().simulateWebhookEvent(jsonInput('body'))),
  'verify-webhook-signature': async () => setJsonOutput('result', await getClient().verifyWebhookSignature(jsonInput('body'))),

  // ── Crypto Onramp ───────────────────────────────────────────────────
  'create-onramp-session': async () => setJsonOutput('result', await getClient().createOnrampSession(jsonInput('body'))),
  'get-onramp-session': async () => setJsonOutput('result', await getClient().getOnrampSession(req('session-id'))),
  'get-onramp-quotes': async () => setJsonOutput('result', await getClient().getOnrampQuotes(query('source-currency', 'destination-currency', 'source-amount'))),

  // ── Identity ────────────────────────────────────────────────────────
  'get-userinfo': async () => setJsonOutput('result', await getClient().getUserInfo()),
})

router()
