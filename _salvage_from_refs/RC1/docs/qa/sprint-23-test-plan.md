# Sprint 23 Test Plan

## Payments
- Simulate Stripe webhook with valid and invalid HMAC
- Ensure idempotent processing using order metadata
- Verify refund revokes entitlement

## BYOK Rotation
- Mock KMS client to rotate keys and sign/verify

## Gossip Consistency
- Feed auditor mismatched STH to trigger alert

## DP SLA Breach
- Exercise enforcer when error exceeds bound and confirm refund logic
