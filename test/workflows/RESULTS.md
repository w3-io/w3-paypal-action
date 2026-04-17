# E2E Test Results

> Last verified: 2026-04-15 -- PASS (19/19)

## Prerequisites

| Credential                   | Env var                | Source                     |
| ---------------------------- | ---------------------- | -------------------------- |
| PayPal sandbox client ID     | `PAYPAL_CLIENT_ID`     | PayPal developer dashboard |
| PayPal sandbox client secret | `PAYPAL_CLIENT_SECRET` | PayPal developer dashboard |

## Results

| #   | Step                     | Command           | Status | Notes   |
| --- | ------------------------ | ----------------- | ------ | ------- |
| 1   | Create a catalog product | `create-product`  | PASS   |         |
| 2   | List products            | `list-products`   | PASS   |         |
| 3   | Get the product          | `get-product`     | PASS   |         |
| 4   | Update the product       | `update-product`  | PASS   |         |
| 5   | Create an order          | `create-order`    | PASS   |         |
| 6   | Get the order            | `get-order`       | PASS   |         |
| 7   | Update the order         | `update-order`    | PASS   |         |
| 8   | Create a billing plan    | `create-plan`     | PASS   |         |
| 9   | List billing plans       | `list-plans`      | PASS   |         |
| 10  | Get the billing plan     | `get-plan`        | PASS   |         |
| 11  | Deactivate billing plan  | `deactivate-plan` | PASS   |         |
| 12  | Activate billing plan    | `activate-plan`   | PASS   |         |
| 13  | Create an invoice        | `create-invoice`  | PASS   |         |
| 14  | List invoices            | `list-invoices`   | PASS   |         |
| 15  | Get the invoice          | `get-invoice`     | PASS   |         |
| 16  | Update the invoice       | `update-invoice`  | PASS   |         |
| 17  | Search invoices          | `search-invoices` | PASS   |         |
| 18  | Delete the invoice       | `delete-invoice`  | PASS   |         |
| 19  | Delete the product       | `update-product`  | PASS   | Cleanup |

**Summary: 19/19 pass.**

## Skipped Commands

| Command                                                                         | Reason                              |
| ------------------------------------------------------------------------------- | ----------------------------------- |
| `authorize-order` / `capture-order` / `confirm-order`                           | Requires buyer approval (redirect)  |
| Subscription commands                                                           | Requires buyer approval (redirect)  |
| `list-disputes` / dispute detail commands                                       | Requires a real dispute             |
| `send-invoice` / `remind-invoice` / `cancel-invoice` / `record-invoice-payment` | Requires invoice in sent state      |
| `generate-invoice-qr`                                                           | Returns 406 in sandbox              |
| Payment token commands (`create-setup-token`, `get-setup-token`)                | Requires buyer-approved setup token |
| `get-balances`                                                                  | Insufficient permissions in sandbox |
| `update-plan-pricing`                                                           | Requires specific plan state        |
| Payout commands                                                                 | Requires funded sandbox account     |
| Webhook commands                                                                | Tested separately                   |
| Transaction search                                                              | Requires transaction history        |
| Tracking commands                                                               | Requires captured order             |

## How to run

```bash
# Export credentials
export PAYPAL_CLIENT_ID="your-client-id-here"
export PAYPAL_CLIENT_SECRET="your-client-secret-here"

# Run
w3 workflow test --execute test/workflows/e2e.yaml
```
