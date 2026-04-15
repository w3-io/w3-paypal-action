# E2E Test Results

> Last verified: 2026-04-15 -- YAML fixed, not yet run

## Prerequisites

| Credential | Env var | Source |
|-----------|---------|--------|
| PayPal sandbox client ID | `PAYPAL_CLIENT_ID` | PayPal developer dashboard |
| PayPal sandbox client secret | `PAYPAL_CLIENT_SECRET` | PayPal developer dashboard |

## Results

| # | Step | Command | Status | Notes |
|---|------|---------|--------|-------|
| 1 | Create a catalog product | `create-product` | NOT YET VERIFIED | Sandbox |
| 2 | List products | `list-products` | NOT YET VERIFIED | |
| 3 | Get the product | `get-product` | NOT YET VERIFIED | |
| 4 | Update the product | `update-product` | NOT YET VERIFIED | |
| 5 | Create an order | `create-order` | NOT YET VERIFIED | |
| 6 | Get the order | `get-order` | NOT YET VERIFIED | |
| 7 | Update the order | `update-order` | NOT YET VERIFIED | |
| 8 | Create a billing plan | `create-plan` | NOT YET VERIFIED | |
| 9 | List billing plans | `list-plans` | NOT YET VERIFIED | |
| 10 | Get the billing plan | `get-plan` | NOT YET VERIFIED | |
| 11 | Update the billing plan | `update-plan` | NOT YET VERIFIED | |
| 12 | Update plan pricing | `update-plan-pricing` | NOT YET VERIFIED | |
| 13 | Deactivate billing plan | `deactivate-plan` | NOT YET VERIFIED | |
| 14 | Activate billing plan | `activate-plan` | NOT YET VERIFIED | |
| 15 | Generate invoice number | `generate-invoice-number` | NOT YET VERIFIED | |
| 16 | Create an invoice | `create-invoice` | NOT YET VERIFIED | |
| 17 | List invoices | `list-invoices` | NOT YET VERIFIED | |
| 18 | Get the invoice | `get-invoice` | NOT YET VERIFIED | |
| 19 | Update the invoice | `update-invoice` | NOT YET VERIFIED | |
| 20 | Search invoices | `search-invoices` | NOT YET VERIFIED | |
| 21 | Generate invoice QR code | `generate-invoice-qr` | NOT YET VERIFIED | |
| 22 | Send the invoice | `send-invoice` | NOT YET VERIFIED | |
| 23 | Remind the invoice | `remind-invoice` | NOT YET VERIFIED | |
| 24 | Record invoice payment | `record-invoice-payment` | NOT YET VERIFIED | |
| 25 | Record invoice refund | `record-invoice-refund` | NOT YET VERIFIED | |
| 26 | Cancel the invoice | `cancel-invoice` | NOT YET VERIFIED | |
| 27 | Create draft invoice (delete) | `create-invoice` | NOT YET VERIFIED | |
| 28 | Delete the draft invoice | `delete-invoice` | NOT YET VERIFIED | |
| 29 | Create invoice template | `create-invoice-template` | NOT YET VERIFIED | |
| 30 | List invoice templates | `list-invoice-templates` | NOT YET VERIFIED | |
| 31 | Get invoice template | `get-invoice-template` | NOT YET VERIFIED | |
| 32 | Update invoice template | `update-invoice-template` | NOT YET VERIFIED | |
| 33 | Delete invoice template | `delete-invoice-template` | NOT YET VERIFIED | |
| 34 | Create a payout | `create-payout` | NOT YET VERIFIED | |
| 35 | Get the payout batch | `get-payout` | NOT YET VERIFIED | |
| 36 | List disputes | `list-disputes` | NOT YET VERIFIED | |
| 37 | Create a setup token | `create-setup-token` | NOT YET VERIFIED | |
| 38 | Get the setup token | `get-setup-token` | NOT YET VERIFIED | |
| 39 | List webhook event types | `list-webhook-event-types` | NOT YET VERIFIED | |
| 40 | Create a webhook | `create-webhook` | NOT YET VERIFIED | |
| 41 | List webhooks | `list-webhooks` | NOT YET VERIFIED | |
| 42 | Get the webhook | `get-webhook` | NOT YET VERIFIED | |
| 43 | Update the webhook | `update-webhook` | NOT YET VERIFIED | |
| 44 | List webhook events | `list-webhook-events` | NOT YET VERIFIED | |
| 45 | Simulate webhook event | `simulate-webhook-event` | NOT YET VERIFIED | |
| 46 | Delete the webhook | `delete-webhook` | NOT YET VERIFIED | |
| 47 | Search transactions | `search-transactions` | NOT YET VERIFIED | |
| 48 | Get balances | `get-balances` | NOT YET VERIFIED | |
| 49 | Get user info | `get-userinfo` | NOT YET VERIFIED | |

## Skipped Commands

| Command | Reason |
|---------|--------|
| `authorize-order` / `capture-order` / `confirm-order` | Requires buyer approval (redirect) |
| `track-order` / `update-order-tracking` | Requires captured order |
| Payment auth/capture/void/refund commands | Requires buyer-approved order |
| Subscription commands | Requires buyer approval (redirect) |
| `delete-invoice-payment` / `delete-invoice-refund` | Requires IDs from record ops |
| `get-payout-item` / `cancel-payout-item` | Async batch; item may not be ready |
| Dispute detail commands | Requires real dispute |
| Vault token commands | Requires buyer-approved setup token |
| Webhook event detail commands | Requires existing event ID |
| Crypto onramp commands | Requires crypto enablement |

## How to run

```bash
# Export credentials
export PAYPAL_CLIENT_ID="..."
export PAYPAL_CLIENT_SECRET="..."

# Run
w3 workflow test --execute test/workflows/e2e.yaml
```
