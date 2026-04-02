# W3 PayPal Action Reference Guide

W3 PayPal Action wraps the PayPal REST API for W3 workflows, covering orders, payments, payouts, subscriptions, invoicing, disputes, vault, products, reporting, and webhooks -- 88 commands total. This guide covers the top 10 most-used commands. See the [README](../README.md) for the full command list.

## Quick Start

```yaml
- uses: w3/paypal@v1
  id: order
  with:
    command: create-order
    client-id: ${{ secrets.PAYPAL_CLIENT_ID }}
    client-secret: ${{ secrets.PAYPAL_CLIENT_SECRET }}
    body: |
      {
        "intent": "CAPTURE",
        "purchase_units": [{
          "amount": {"currency_code": "USD", "value": "99.99"}
        }]
      }
```

## Top 10 Commands

### create-order

Create a payment order. Set `intent` to `CAPTURE` (immediate) or `AUTHORIZE` (hold funds).

| Input | Required | Description |
|-------|----------|-------------|
| `body` | Yes | Order JSON with `intent` and `purchase_units` |

### capture-order

Capture payment after buyer approval.

| Input | Required | Description |
|-------|----------|-------------|
| `order-id` | Yes | The order to capture |

### get-order

Retrieve order details and status.

| Input | Required | Description |
|-------|----------|-------------|
| `order-id` | Yes | The order to retrieve |

### refund-capture

Refund a captured payment (full or partial).

| Input | Required | Description |
|-------|----------|-------------|
| `capture-id` | Yes | The capture to refund |
| `body` | No | Amount JSON for partial refund |

### create-payout

Send money to up to 15,000 recipients in a single batch.

| Input | Required | Description |
|-------|----------|-------------|
| `body` | Yes | Payout batch with `sender_batch_header` and `items` |

### create-subscription

Create a recurring billing subscription linked to a plan.

| Input | Required | Description |
|-------|----------|-------------|
| `body` | Yes | Subscription JSON with `plan_id` and `subscriber` |

### create-invoice

Create a draft invoice. Send it separately with `send-invoice`.

| Input | Required | Description |
|-------|----------|-------------|
| `body` | Yes | Invoice JSON with `detail`, `invoicer`, `primary_recipients` |

### send-invoice

Email a draft invoice to the recipient.

| Input | Required | Description |
|-------|----------|-------------|
| `invoice-id` | Yes | The draft invoice to send |
| `body` | No | Optional send options (subject, note, etc.) |

### search-transactions

Search transaction history with date range and filters.

| Input | Required | Description |
|-------|----------|-------------|
| `start-date` | Yes | ISO 8601 start date |
| `end-date` | Yes | ISO 8601 end date |
| `transaction-type` | No | Filter by type |
| `transaction-status` | No | Filter by status |

### create-webhook

Register a webhook endpoint to receive event notifications.

| Input | Required | Description |
|-------|----------|-------------|
| `body` | Yes | Webhook URL and event types |

## All Command Categories

| Category | Count | Examples |
|----------|-------|---------|
| Orders | 8 | `create-order`, `capture-order`, `authorize-order` |
| Payments | 7 | `capture-authorization`, `refund-capture`, `get-refund` |
| Payouts | 4 | `create-payout`, `get-payout`, `cancel-payout-item` |
| Plans | 7 | `create-plan`, `activate-plan`, `update-plan-pricing` |
| Subscriptions | 9 | `create-subscription`, `cancel-subscription` |
| Invoicing | 17 | `create-invoice`, `send-invoice`, `search-invoices` |
| Disputes | 10 | `list-disputes`, `provide-dispute-evidence` |
| Vault | 6 | `create-setup-token`, `create-payment-token` |
| Products | 4 | `create-product`, `list-products` |
| Reporting | 2 | `search-transactions`, `get-balances` |
| Webhooks | 11 | `create-webhook`, `verify-webhook-signature` |
| Identity | 1 | `get-userinfo` |

See the [README](../README.md) for the complete input/output reference.

## Authentication

PayPal uses OAuth2. The action automatically exchanges your Client ID and Secret for a Bearer token on each call.

| Environment | `api-url` value |
|-------------|-----------------|
| Sandbox | `https://api-m.sandbox.paypal.com` (default) |
| Production | `https://api-m.paypal.com` |

Get credentials at https://developer.paypal.com/developer/applications.

Note: PYUSD (PayPal's stablecoin) is a standard ERC-20/SPL token -- there is no PayPal REST API for it. Use the W3 bridge SDK's Ethereum or Solana syscalls instead.

## Full Workflow Example

```yaml
name: Process payment and send payout
on: workflow_dispatch

jobs:
  payment:
    runs-on: ubuntu-latest
    steps:
      - name: Create order
        uses: w3/paypal@v1
        id: order
        with:
          command: create-order
          client-id: ${{ secrets.PAYPAL_CLIENT_ID }}
          client-secret: ${{ secrets.PAYPAL_CLIENT_SECRET }}
          body: |
            {
              "intent": "CAPTURE",
              "purchase_units": [{
                "amount": {"currency_code": "USD", "value": "250.00"},
                "description": "Consulting services"
              }]
            }

      - name: Capture payment
        uses: w3/paypal@v1
        id: capture
        with:
          command: capture-order
          client-id: ${{ secrets.PAYPAL_CLIENT_ID }}
          client-secret: ${{ secrets.PAYPAL_CLIENT_SECRET }}
          order-id: ${{ fromJson(steps.order.outputs.result).id }}

      - name: Send payout to contractor
        uses: w3/paypal@v1
        with:
          command: create-payout
          client-id: ${{ secrets.PAYPAL_CLIENT_ID }}
          client-secret: ${{ secrets.PAYPAL_CLIENT_SECRET }}
          body: |
            {
              "sender_batch_header": {
                "sender_batch_id": "batch-${{ github.run_id }}",
                "email_subject": "Payment received"
              },
              "items": [{
                "recipient_type": "EMAIL",
                "amount": {"value": "200.00", "currency": "USD"},
                "receiver": "contractor@example.com",
                "note": "Thanks for your work"
              }]
            }

      - name: Verify transaction
        uses: w3/paypal@v1
        id: txns
        with:
          command: search-transactions
          client-id: ${{ secrets.PAYPAL_CLIENT_ID }}
          client-secret: ${{ secrets.PAYPAL_CLIENT_SECRET }}
          start-date: '2025-01-01T00:00:00Z'
          end-date: '2025-12-31T23:59:59Z'
          transaction-status: S
```
