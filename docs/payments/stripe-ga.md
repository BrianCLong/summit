# Stripe GA

Production mode uses live Stripe keys with webhooks behind OPA and mTLS. CI uses Stripe fixtures with network egress disabled.

## Environments

- `STRIPE_SECRET` loaded from environment
- Allowed domains: `api.stripe.com`, `hooks.stripe.com`

## Webhooks

- Verify `Stripe-Signature` header with HMAC SHA256
- Enforce idempotency keys

## Fixtures

- Test JSON payloads reside under `server/src/tests/fixtures/payments`
