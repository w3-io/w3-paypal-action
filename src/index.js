/**
 * W3 PayPal Action — 91 commands across 12 categories.
 *
 * Orders, payments, payouts, subscriptions, invoicing, disputes,
 * vault, catalog products, reporting, webhooks, crypto onramp,
 * and identity.
 */

import { createCommandRouter, setJsonOutput } from '@w3-io/action-core'
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
  try { return JSON.parse(raw) } catch { return raw }
}

function body() { return jsonInput('body') }
function req(name) { return core.getInput(name, { required: true }) }
function opt(name) { return core.getInput(name) || undefined }

function query(...names) {
  const q = {}
  for (const name of names) {
    const v = core.getInput(name)
    if (v) q[name.replace(/-/g, '_')] = v
  }
  return Object.keys(q).length ? q : undefined
}

const router = createCommandRouter({
  // ── Orders ──────────────────────────────────────────────────────────
  'create-order': async () => setJsonOutput('result', await getClient().createOrder(body())),
  'get-order': async () => setJsonOutput('result', await getClient().getOrder(req('order-id'))),
  'update-order': async () => setJsonOutput('result', await getClient().updateOrder(req('order-id'), body())),
  'authorize-order': async () => setJsonOutput('result', await getClient().authorizeOrder(req('order-id'), body())),
  'capture-order': async () => setJsonOutput('result', await getClient().captureOrder(req('order-id'), body())),
  'confirm-order': async () => setJsonOutput('result', await getClient().confirmOrder(req('order-id'), body())),
  'track-order': async () => setJsonOutput('result', await getClient().trackOrder(req('order-id'), body())),
  'update-order-tracking': async () => setJsonOutput('result', await getClient().updateOrderTracking(req('order-id'), req('tracker-id'), body())),

  // ── Payments ────────────────────────────────────────────────────────
  'get-authorization': async () => setJsonOutput('result', await getClient().getAuthorization(req('authorization-id'))),
  'capture-authorization': async () => setJsonOutput('result', await getClient().captureAuthorization(req('authorization-id'), body())),
  'reauthorize': async () => setJsonOutput('result', await getClient().reauthorize(req('authorization-id'), body())),
  'void-authorization': async () => setJsonOutput('result', await getClient().voidAuthorization(req('authorization-id'))),
  'get-capture': async () => setJsonOutput('result', await getClient().getCapture(req('capture-id'))),
  'refund-capture': async () => setJsonOutput('result', await getClient().refundCapture(req('capture-id'), body())),
  'get-refund': async () => setJsonOutput('result', await getClient().getRefund(req('refund-id'))),

  // ── Payouts ─────────────────────────────────────────────────────────
  'create-payout': async () => setJsonOutput('result', await getClient().createPayout(body())),
  'get-payout': async () => setJsonOutput('result', await getClient().getPayout(req('payout-id'))),
  'get-payout-item': async () => setJsonOutput('result', await getClient().getPayoutItem(req('item-id'))),
  'cancel-payout-item': async () => setJsonOutput('result', await getClient().cancelPayoutItem(req('item-id'))),

  // ── Billing Plans ───────────────────────────────────────────────────
  'create-plan': async () => setJsonOutput('result', await getClient().createPlan(body())),
  'list-plans': async () => setJsonOutput('result', await getClient().listPlans(query('page-size', 'page', 'total-required'))),
  'get-plan': async () => setJsonOutput('result', await getClient().getPlan(req('plan-id'))),
  'update-plan': async () => setJsonOutput('result', await getClient().updatePlan(req('plan-id'), body())),
  'activate-plan': async () => setJsonOutput('result', await getClient().activatePlan(req('plan-id'))),
  'deactivate-plan': async () => setJsonOutput('result', await getClient().deactivatePlan(req('plan-id'))),
  'update-plan-pricing': async () => setJsonOutput('result', await getClient().updatePlanPricing(req('plan-id'), body())),

  // ── Subscriptions ───────────────────────────────────────────────────
  'create-subscription': async () => setJsonOutput('result', await getClient().createSubscription(body())),
  'get-subscription': async () => setJsonOutput('result', await getClient().getSubscription(req('subscription-id'))),
  'update-subscription': async () => setJsonOutput('result', await getClient().updateSubscription(req('subscription-id'), body())),
  'revise-subscription': async () => setJsonOutput('result', await getClient().reviseSubscription(req('subscription-id'), body())),
  'suspend-subscription': async () => setJsonOutput('result', await getClient().suspendSubscription(req('subscription-id'), body())),
  'cancel-subscription': async () => setJsonOutput('result', await getClient().cancelSubscription(req('subscription-id'), body())),
  'activate-subscription': async () => setJsonOutput('result', await getClient().activateSubscription(req('subscription-id'), body())),
  'capture-subscription': async () => setJsonOutput('result', await getClient().captureSubscription(req('subscription-id'), body())),
  'list-subscription-transactions': async () => setJsonOutput('result', await getClient().listSubscriptionTransactions(req('subscription-id'), query('start-date', 'end-date'))),

  // ── Invoicing ───────────────────────────────────────────────────────
  'create-invoice': async () => setJsonOutput('result', await getClient().createInvoice(body())),
  'list-invoices': async () => setJsonOutput('result', await getClient().listInvoices(query('page', 'page-size', 'total-required', 'fields'))),
  'get-invoice': async () => setJsonOutput('result', await getClient().getInvoice(req('invoice-id'))),
  'update-invoice': async () => setJsonOutput('result', await getClient().updateInvoice(req('invoice-id'), body())),
  'delete-invoice': async () => setJsonOutput('result', await getClient().deleteInvoice(req('invoice-id'))),
  'send-invoice': async () => setJsonOutput('result', await getClient().sendInvoice(req('invoice-id'), body())),
  'remind-invoice': async () => setJsonOutput('result', await getClient().remindInvoice(req('invoice-id'), body())),
  'cancel-invoice': async () => setJsonOutput('result', await getClient().cancelInvoice(req('invoice-id'), body())),
  'record-invoice-payment': async () => setJsonOutput('result', await getClient().recordInvoicePayment(req('invoice-id'), body())),
  'delete-invoice-payment': async () => setJsonOutput('result', await getClient().deleteInvoicePayment(req('invoice-id'), req('payment-id'))),
  'record-invoice-refund': async () => setJsonOutput('result', await getClient().recordInvoiceRefund(req('invoice-id'), body())),
  'generate-invoice-qr': async () => setJsonOutput('result', await getClient().generateInvoiceQr(req('invoice-id'), body())),
  'generate-invoice-number': async () => setJsonOutput('result', await getClient().generateInvoiceNumber()),
  'search-invoices': async () => setJsonOutput('result', await getClient().searchInvoices(body())),
  'list-invoice-templates': async () => setJsonOutput('result', await getClient().listInvoiceTemplates(query('page', 'page-size', 'fields'))),
  'create-invoice-template': async () => setJsonOutput('result', await getClient().createInvoiceTemplate(body())),
  'get-invoice-template': async () => setJsonOutput('result', await getClient().getInvoiceTemplate(req('template-id'))),
  'update-invoice-template': async () => setJsonOutput('result', await getClient().updateInvoiceTemplate(req('template-id'), body())),
  'delete-invoice-template': async () => setJsonOutput('result', await getClient().deleteInvoiceTemplate(req('template-id'))),

  // ── Disputes ────────────────────────────────────────────────────────
  'list-disputes': async () => setJsonOutput('result', await getClient().listDisputes(query('start-date', 'status', 'page-size'))),
  'get-dispute': async () => setJsonOutput('result', await getClient().getDispute(req('dispute-id'))),
  'accept-dispute-claim': async () => setJsonOutput('result', await getClient().acceptDisputeClaim(req('dispute-id'), body())),
  'escalate-dispute': async () => setJsonOutput('result', await getClient().escalateDispute(req('dispute-id'), body())),
  'provide-dispute-evidence': async () => setJsonOutput('result', await getClient().provideDisputeEvidence(req('dispute-id'), body())),
  'appeal-dispute': async () => setJsonOutput('result', await getClient().appealDispute(req('dispute-id'), body())),
  'send-dispute-message': async () => setJsonOutput('result', await getClient().sendDisputeMessage(req('dispute-id'), body())),
  'make-dispute-offer': async () => setJsonOutput('result', await getClient().makeDisputeOffer(req('dispute-id'), body())),
  'accept-dispute-offer': async () => setJsonOutput('result', await getClient().acceptDisputeOffer(req('dispute-id'), body())),
  'deny-dispute-offer': async () => setJsonOutput('result', await getClient().denyDisputeOffer(req('dispute-id'), body())),

  // ── Vault / Payment Tokens ──────────────────────────────────────────
  'create-setup-token': async () => setJsonOutput('result', await getClient().createSetupToken(body())),
  'get-setup-token': async () => setJsonOutput('result', await getClient().getSetupToken(req('token-id'))),
  'create-payment-token': async () => setJsonOutput('result', await getClient().createPaymentToken(body())),
  'list-payment-tokens': async () => setJsonOutput('result', await getClient().listPaymentTokens(query('customer-id'))),
  'get-payment-token': async () => setJsonOutput('result', await getClient().getPaymentToken(req('token-id'))),
  'delete-payment-token': async () => setJsonOutput('result', await getClient().deletePaymentToken(req('token-id'))),

  // ── Catalog Products ────────────────────────────────────────────────
  'create-product': async () => setJsonOutput('result', await getClient().createProduct(body())),
  'list-products': async () => setJsonOutput('result', await getClient().listProducts(query('page-size', 'page', 'total-required'))),
  'get-product': async () => setJsonOutput('result', await getClient().getProduct(req('product-id'))),
  'update-product': async () => setJsonOutput('result', await getClient().updateProduct(req('product-id'), body())),

  // ── Reporting ───────────────────────────────────────────────────────
  'search-transactions': async () => setJsonOutput('result', await getClient().searchTransactions(
    query('start-date', 'end-date', 'transaction-id', 'transaction-type', 'transaction-status', 'transaction-amount', 'currency-code', 'page-size', 'page', 'fields'),
  )),
  'get-balances': async () => setJsonOutput('result', await getClient().getBalances(query('balance-date', 'currency-code'))),

  // ── Webhooks ────────────────────────────────────────────────────────
  'create-webhook': async () => setJsonOutput('result', await getClient().createWebhook(body())),
  'list-webhooks': async () => setJsonOutput('result', await getClient().listWebhooks()),
  'get-webhook': async () => setJsonOutput('result', await getClient().getWebhook(req('webhook-id'))),
  'update-webhook': async () => setJsonOutput('result', await getClient().updateWebhook(req('webhook-id'), body())),
  'delete-webhook': async () => setJsonOutput('result', await getClient().deleteWebhook(req('webhook-id'))),
  'list-webhook-event-types': async () => setJsonOutput('result', await getClient().listWebhookEventTypes()),
  'list-webhook-events': async () => setJsonOutput('result', await getClient().listWebhookEvents(query('start-date', 'end-date', 'page-size', 'event-type'))),
  'get-webhook-event': async () => setJsonOutput('result', await getClient().getWebhookEvent(req('event-id'))),
  'resend-webhook-event': async () => setJsonOutput('result', await getClient().resendWebhookEvent(req('event-id'), body())),
  'simulate-webhook-event': async () => setJsonOutput('result', await getClient().simulateWebhookEvent(body())),
  'verify-webhook-signature': async () => setJsonOutput('result', await getClient().verifyWebhookSignature(body())),

  // ── Crypto Onramp ───────────────────────────────────────────────────
  'create-onramp-session': async () => setJsonOutput('result', await getClient().createOnrampSession(body())),
  'get-onramp-session': async () => setJsonOutput('result', await getClient().getOnrampSession(req('session-id'))),
  'get-onramp-quotes': async () => setJsonOutput('result', await getClient().getOnrampQuotes(query('source-currency', 'destination-currency', 'source-amount'))),

  // ── Identity ────────────────────────────────────────────────────────
  'get-userinfo': async () => setJsonOutput('result', await getClient().getUserInfo()),
})

router()
