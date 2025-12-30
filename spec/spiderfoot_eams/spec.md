# SpiderFoot Egress-Accounted Module Sandboxing (EAMS) Specification

## Concept

EAMS executes OSINT modules inside sandboxes that enforce allowed egress policies and emit egress receipts. Receipts enable detection of disallowed active probing and generate compliance artifacts with replay tokens.

## Data model

- **Module request**: Target, module version set, subject context, purpose.
- **Sandbox policy**: Allowed endpoint classes, methods, byte and rate limits; passive-only defaults.
- **Egress receipt**: Categorized destinations, byte counts, halt events, commitments, replay token.

## Processing flow

1. Receive module execution request and select sandbox policy based on module reputation and authorization tokens.
2. Execute module within sandbox; monitor DNS/HTTP/TCP egress and enforce byte/rate limits.
3. Build egress receipt with hash-chain commitments, category labels, and halt events when limits are hit.
4. Evaluate compliance decision against sandbox policy; bind decision to subject context and purpose.
5. Emit module results together with receipt, decision identifier, and optional attestation quote; publish digest to transparency log.
