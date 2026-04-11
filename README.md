# W3 PayPal Action

Complete PayPal API for W3 workflows. 91 commands covering orders, payments, payouts, subscriptions, invoicing, disputes, vault, catalog products, reporting, webhooks, crypto onramp, and identity.

## Commands

### Orders (8)

| Command                 | Description                            |
| ----------------------- | -------------------------------------- |
| `create-order`          | Create a payment order                 |
| `get-order`             | Get order details                      |
| `update-order`          | Update order (CREATED/APPROVED status) |
| `authorize-order`       | Authorize payment for an order         |
| `capture-order`         | Capture payment for an order           |
| `confirm-order`         | Confirm payer's payment source         |
| `track-order`           | Add shipment tracking                  |
| `update-order-tracking` | Update or cancel tracking              |

### Payments (7)

| Command                 | Description                   |
| ----------------------- | ----------------------------- |
| `get-authorization`     | Get authorization details     |
| `capture-authorization` | Capture an authorized payment |
| `reauthorize`           | Reauthorize a payment         |
| `void-authorization`    | Void an authorization         |
| `get-capture`           | Get capture details           |
| `refund-capture`        | Refund a captured payment     |
| `get-refund`            | Get refund details            |

### Payouts (4)

| Command              | Description                                 |
| -------------------- | ------------------------------------------- |
| `create-payout`      | Send batch payout (up to 15,000 recipients) |
| `get-payout`         | Get batch payout status                     |
| `get-payout-item`    | Get individual payout item                  |
| `cancel-payout-item` | Cancel unclaimed payout                     |

### Subscriptions -- Plans (7)

| Command               | Description            |
| --------------------- | ---------------------- |
| `create-plan`         | Create a billing plan  |
| `list-plans`          | List plans             |
| `get-plan`            | Get plan details       |
| `update-plan`         | Update plan            |
| `activate-plan`       | Activate a plan        |
| `deactivate-plan`     | Deactivate a plan      |
| `update-plan-pricing` | Update pricing schemes |

### Subscriptions -- Subscriptions (9)

| Command                          | Description                    |
| -------------------------------- | ------------------------------ |
| `create-subscription`            | Create a subscription          |
| `get-subscription`               | Get subscription details       |
| `update-subscription`            | Update subscription            |
| `revise-subscription`            | Change plan or quantity        |
| `suspend-subscription`           | Suspend subscription           |
| `cancel-subscription`            | Cancel subscription            |
| `activate-subscription`          | Reactivate subscription        |
| `capture-subscription`           | Capture outstanding payment    |
| `list-subscription-transactions` | List subscription transactions |

### Invoicing (17)

| Command                   | Description               |
| ------------------------- | ------------------------- |
| `create-invoice`          | Create a draft invoice    |
| `list-invoices`           | List invoices             |
| `get-invoice`             | Get invoice details       |
| `update-invoice`          | Update invoice            |
| `delete-invoice`          | Delete invoice            |
| `send-invoice`            | Send invoice to recipient |
| `remind-invoice`          | Send payment reminder     |
| `cancel-invoice`          | Cancel sent invoice       |
| `record-invoice-payment`  | Record external payment   |
| `delete-invoice-payment`  | Delete recorded payment   |
| `record-invoice-refund`   | Record external refund    |
| `generate-invoice-qr`     | Generate QR code          |
| `generate-invoice-number` | Auto-generate next number |
| `search-invoices`         | Search invoices           |
| `list-invoice-templates`  | List templates            |
| `create-invoice-template` | Create template           |
| `get-invoice-template`    | Get template              |
| `update-invoice-template` | Update template           |
| `delete-invoice-template` | Delete template           |

### Disputes (10)

| Command                    | Description              |
| -------------------------- | ------------------------ |
| `list-disputes`            | List disputes            |
| `get-dispute`              | Get dispute details      |
| `accept-dispute-claim`     | Accept liability         |
| `escalate-dispute`         | Escalate to PayPal claim |
| `provide-dispute-evidence` | Submit evidence          |
| `appeal-dispute`           | Appeal a decision        |
| `send-dispute-message`     | Message other party      |
| `make-dispute-offer`       | Propose settlement       |
| `accept-dispute-offer`     | Accept offer             |
| `deny-dispute-offer`       | Deny offer               |

### Vault / Payment Tokens (6)

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `create-setup-token`   | Create temporary vault reference |
| `get-setup-token`      | Get setup token                  |
| `create-payment-token` | Save payment method permanently  |
| `list-payment-tokens`  | List saved payment methods       |
| `get-payment-token`    | Get payment token                |
| `delete-payment-token` | Delete payment token             |

### Products (4)

| Command          | Description                        |
| ---------------- | ---------------------------------- |
| `create-product` | Create product (for subscriptions) |
| `list-products`  | List products                      |
| `get-product`    | Get product details                |
| `update-product` | Update product                     |

### Reporting (2)

| Command               | Description                |
| --------------------- | -------------------------- |
| `search-transactions` | Search transaction history |
| `get-balances`        | Get account balances       |

### Webhooks (11)

| Command                    | Description                 |
| -------------------------- | --------------------------- |
| `create-webhook`           | Create webhook endpoint     |
| `list-webhooks`            | List webhooks               |
| `get-webhook`              | Get webhook details         |
| `update-webhook`           | Update webhook              |
| `delete-webhook`           | Delete webhook              |
| `list-webhook-event-types` | List available event types  |
| `list-webhook-events`      | List received events        |
| `get-webhook-event`        | Get event details           |
| `resend-webhook-event`     | Resend event                |
| `simulate-webhook-event`   | Simulate event (sandbox)    |
| `verify-webhook-signature` | Verify webhook authenticity |

### Crypto Onramp (3)

| Command                 | Description                      |
| ----------------------- | -------------------------------- |
| `create-onramp-session` | Create a crypto purchase session |
| `get-onramp-session`    | Get onramp session status        |
| `get-onramp-quotes`     | Get crypto purchase quotes       |

### Identity (1)

| Command        | Description             |
| -------------- | ----------------------- |
| `get-userinfo` | Get PayPal user profile |

## Inputs

| Name                 | Required | Default                            | Description                        |
| -------------------- | -------- | ---------------------------------- | ---------------------------------- |
| `command`            | Yes      |                                    | Operation to perform (88 commands) |
| `client-id`          | Yes      |                                    | PayPal OAuth2 Client ID            |
| `client-secret`      | Yes      |                                    | PayPal OAuth2 Client Secret        |
| `api-url`            | No       | `https://api-m.sandbox.paypal.com` | PayPal API base URL                |
| `body`               | No       |                                    | Request body as JSON               |
| `order-id`           | No       |                                    | Order ID                           |
| `authorization-id`   | No       |                                    | Authorization ID                   |
| `capture-id`         | No       |                                    | Capture ID                         |
| `refund-id`          | No       |                                    | Refund ID                          |
| `payout-id`          | No       |                                    | Batch payout ID                    |
| `item-id`            | No       |                                    | Payout item ID                     |
| `plan-id`            | No       |                                    | Billing plan ID                    |
| `subscription-id`    | No       |                                    | Subscription ID                    |
| `invoice-id`         | No       |                                    | Invoice ID                         |
| `template-id`        | No       |                                    | Invoice template ID                |
| `dispute-id`         | No       |                                    | Dispute ID                         |
| `token-id`           | No       |                                    | Vault setup or payment token ID    |
| `product-id`         | No       |                                    | Catalog product ID                 |
| `tracker-id`         | No       |                                    | Shipment tracker ID                |
| `webhook-id`         | No       |                                    | Webhook ID                         |
| `event-id`           | No       |                                    | Webhook event ID                   |
| `transaction-id`     | No       |                                    | Transaction ID (for reporting)     |
| `payment-id`         | No       |                                    | Recorded payment ID (for invoice)  |
| `customer-id`        | No       |                                    | Customer ID (for vault)            |
| `start-date`         | No       |                                    | Start date (ISO 8601)              |
| `end-date`           | No       |                                    | End date (ISO 8601)                |
| `status`             | No       |                                    | Status filter                      |
| `page`               | No       |                                    | Page number                        |
| `page-size`          | No       |                                    | Page size                          |
| `total-required`     | No       |                                    | Include total count in response    |
| `fields`             | No       |                                    | Fields filter (for reporting)      |
| `currency-code`      | No       |                                    | Currency code filter               |
| `balance-date`       | No       |                                    | Balance as-of date (ISO 8601)      |
| `transaction-type`   | No       |                                    | Transaction type filter            |
| `transaction-status` | No       |                                    | Transaction status filter          |
| `transaction-amount` | No       |                                    | Transaction amount filter          |
| `event-type`         | No       |                                    | Webhook event type filter          |

```yaml
- uses: w3-io/w3-paypal-action@v1
  id: order
  with:
    command: create-order
    client-id: ${{ secrets.PAYPAL_CLIENT_ID }}
    client-secret: ${{ secrets.PAYPAL_CLIENT_SECRET }}
    body: |
      {
        "intent": "CAPTURE",
        "purchase_units": [{
          "amount": {"currency_code": "USD", "value": "99.99"},
          "description": "Premium Plan"
        }]
      }
```

### Send a Payout

```yaml
- uses: w3-io/w3-paypal-action@v1
  with:
    command: create-payout
    client-id: ${{ secrets.PAYPAL_CLIENT_ID }}
    client-secret: ${{ secrets.PAYPAL_CLIENT_SECRET }}
    body: |
      {
        "sender_batch_header": {
          "sender_batch_id": "batch-${{ github.run_id }}",
          "email_subject": "You have a payment"
        },
        "items": [{
          "recipient_type": "EMAIL",
          "amount": {"value": "50.00", "currency": "USD"},
          "receiver": "recipient@example.com"
        }]
      }
```

### Create and Send an Invoice

```yaml
- uses: w3-io/w3-paypal-action@v1
  id: invoice
  with:
    command: create-invoice
    client-id: ${{ secrets.PAYPAL_CLIENT_ID }}
    client-secret: ${{ secrets.PAYPAL_CLIENT_SECRET }}
    body: |
      {
        "detail": {
          "currency_code": "USD",
          "invoice_number": "INV-001",
          "payment_term": {"term_type": "NET_30"}
        },
        "primary_recipients": [{"billing_info": {"email_address": "client@example.com"}}],
        "items": [{"name": "Consulting", "quantity": "10", "unit_amount": {"currency_code": "USD", "value": "150.00"}}]
      }

- uses: w3-io/w3-paypal-action@v1
  with:
    command: send-invoice
    client-id: ${{ secrets.PAYPAL_CLIENT_ID }}
    client-secret: ${{ secrets.PAYPAL_CLIENT_SECRET }}
    invoice-id: INV2-XXXX-XXXX-XXXX-XXXX
```

### Recurring Subscription

```yaml
# Create a product
- uses: w3-io/w3-paypal-action@v1
  id: product
  with:
    command: create-product
    client-id: ${{ secrets.PAYPAL_CLIENT_ID }}
    client-secret: ${{ secrets.PAYPAL_CLIENT_SECRET }}
    body: '{"name": "SaaS Platform", "type": "SERVICE"}'

# Create a billing plan
- uses: w3-io/w3-paypal-action@v1
  id: plan
  with:
    command: create-plan
    client-id: ${{ secrets.PAYPAL_CLIENT_ID }}
    client-secret: ${{ secrets.PAYPAL_CLIENT_SECRET }}
    body: |
      {
        "product_id": "${{ fromJson(steps.product.outputs.result).id }}",
        "name": "Monthly Pro",
        "billing_cycles": [{
          "frequency": {"interval_unit": "MONTH", "interval_count": 1},
          "tenure_type": "REGULAR",
          "sequence": 1,
          "pricing_scheme": {"fixed_price": {"value": "29.99", "currency_code": "USD"}}
        }],
        "payment_preferences": {"auto_bill_outstanding": true}
      }
```

## Authentication

PayPal uses OAuth2. The action automatically exchanges your Client ID and Secret for a Bearer token on each invocation. Get credentials at https://developer.paypal.com/developer/applications.

| Environment | URL                                  |
| ----------- | ------------------------------------ |
| Production  | `https://api-m.paypal.com` (default) |
| Sandbox     | `https://api-m.sandbox.paypal.com`   |

PYUSD (PayPal's stablecoin) is a standard ERC-20 (Ethereum) and SPL (Solana) token. There is no PayPal REST API for PYUSD -- interact with it using the W3 bridge SDK's Ethereum or Solana syscalls.
