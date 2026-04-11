# PayPal Action — Test Coverage & Next Steps

## Tested and passing (24 commands)

| #   | Command                    | Method | Category  | Notes                    |
| --- | -------------------------- | ------ | --------- | ------------------------ |
| 1   | `create-order`             | POST   | Orders    | Output chaining verified |
| 2   | `get-order`                | GET    | Orders    | fromJSON output chaining |
| 3   | `update-order`             | PATCH  | Orders    | JSON Patch format        |
| 4   | `list-products`            | GET    | Products  | Pagination params        |
| 5   | `create-product`           | POST   | Products  |                          |
| 6   | `get-product`              | GET    | Products  | ID from output           |
| 7   | `update-product`           | PATCH  | Products  | JSON Patch, 204 response |
| 8   | `create-plan`              | POST   | Plans     | References product ID    |
| 9   | `get-plan`                 | GET    | Plans     |                          |
| 10  | `deactivate-plan`          | POST   | Plans     | 204 response             |
| 11  | `activate-plan`            | POST   | Plans     | 204 response             |
| 12  | `list-plans`               | GET    | Plans     |                          |
| 13  | `create-webhook`           | POST   | Webhooks  |                          |
| 14  | `list-webhooks`            | GET    | Webhooks  |                          |
| 15  | `get-webhook`              | GET    | Webhooks  | ID from output           |
| 16  | `update-webhook`           | PATCH  | Webhooks  |                          |
| 17  | `delete-webhook`           | DELETE | Webhooks  | 204 response             |
| 18  | `list-webhook-event-types` | GET    | Webhooks  |                          |
| 19  | `generate-invoice-number`  | POST   | Invoicing |                          |
| 20  | `create-invoice`           | POST   | Invoicing |                          |
| 21  | `list-invoices`            | GET    | Invoicing |                          |
| 22  | `search-invoices`          | POST   | Invoicing |                          |
| 23  | `get-userinfo`             | GET    | Identity  |                          |
| 24  | `list-plans`               | GET    | Plans     |                          |

## Not yet tested — needs sandbox setup

These require specific sandbox account configuration or buyer interaction flows:

### Payments lifecycle (7) — needs authorized order

- [ ] `authorize-order` — requires buyer approval first
- [ ] `capture-order` — requires authorized order
- [ ] `get-authorization` — needs authorization ID
- [ ] `capture-authorization` — needs authorization
- [ ] `reauthorize` — needs authorization
- [ ] `void-authorization` — needs authorization
- [ ] `refund-capture` — needs captured payment

### Payouts (4) — needs business account with payouts enabled

- [ ] `create-payout` — sandbox returned USER_BUSINESS_ERROR
- [ ] `get-payout`
- [ ] `get-payout-item`
- [ ] `cancel-payout-item`

### Subscriptions (9) — needs buyer approval flow

- [ ] `create-subscription` — returns approval URL, needs buyer
- [ ] `get-subscription`
- [ ] `update-subscription`
- [ ] `revise-subscription`
- [ ] `suspend-subscription`
- [ ] `cancel-subscription`
- [ ] `activate-subscription`
- [ ] `capture-subscription`
- [ ] `list-subscription-transactions`

### Invoicing lifecycle (7) — needs invoice ID extraction

- [ ] `get-invoice` — create returns href, need to parse ID
- [ ] `update-invoice`
- [ ] `delete-invoice`
- [ ] `send-invoice`
- [ ] `remind-invoice`
- [ ] `cancel-invoice`
- [ ] `record-invoice-payment`

### Additional invoice commands (4)

- [ ] `delete-invoice-payment`
- [ ] `record-invoice-refund`
- [ ] `generate-invoice-qr`
- [ ] `list-invoice-templates` / `create-invoice-template` / `get-invoice-template` / `update-invoice-template` / `delete-invoice-template`

### Disputes (10) — needs real disputes in sandbox

- [ ] All 10 dispute commands — require dispute to exist

### Vault / Payment Tokens (6) — needs card vaulting setup

- [ ] `create-setup-token`
- [ ] `get-setup-token`
- [ ] `create-payment-token`
- [ ] `list-payment-tokens`
- [ ] `get-payment-token`
- [ ] `delete-payment-token`

### Reporting (2) — needs account permissions

- [ ] `search-transactions` — sandbox returned NOT_AUTHORIZED
- [ ] `get-balances` — sandbox returned NOT_AUTHORIZED

### Webhooks (3) — needs specific setup

- [ ] `simulate-webhook-event` — returned VALIDATION_ERROR
- [ ] `resend-webhook-event` — needs event ID
- [ ] `verify-webhook-signature` — needs real webhook payload

### Crypto Onramp (3) — may not be in all sandboxes

- [ ] `create-onramp-session`
- [ ] `get-onramp-session`
- [ ] `get-onramp-quotes`

### Misc (3)

- [ ] `get-capture`
- [ ] `get-refund`
- [ ] `confirm-order`
- [ ] `track-order` / `update-order-tracking`
- [ ] `update-plan-pricing`

## Known issues

- [ ] `create-invoice` returns a HATEOAS link `{href, rel, method}` instead of the full invoice. Workflow authors must parse the invoice ID from the URL. Consider: action follows the href and returns the full invoice.
- [ ] No retry/backoff on `#apiCall` — we bypassed `action-core`'s `request()` (which has retry) to handle 204 responses. Consider adding retry logic to `#apiCall`.
- [ ] No timeout on `#apiCall` — same issue.

## Documentation

- [ ] Add `docs/guide.md` — MCP integration guide
- [ ] Add `w3-action.yaml` — MCP registry schema
- [ ] Add to `w3-mcp/registry.yaml` — register all 91 commands
- [ ] Add `content/integrations/paypal.md` to w3-mcp

## Tests

- [ ] Unit tests (`test/client.test.js`) — mock OAuth, verify URL construction, 204 handling
- [ ] Add test workflow to `.github/workflows/test.yml` — runs against sandbox on push
- [ ] Add sandbox secrets to repo: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
