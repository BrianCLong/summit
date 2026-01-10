# Suspicious Payload Detection

## Overview

We have implemented a heuristic-based detection system for suspicious payloads during receipt ingestion. This system checks for anomalies such as extreme amounts, unusual currency codes, huge line items, and weird encodings.

## Enabled Checks

1.  **Extreme Amounts**: Checks for values in fields like `amount`, `price`, `total`, `value` exceeding `1,000,000,000`.
2.  **Unusual Currency Codes**: Checks for currency codes not in the standard allowlist (e.g., test codes like `XXX`, `XTS`).
3.  **Huge Line Items**: Checks for arrays exceeding `10,000` items.
4.  **Weird Encodings**: Checks for strings exceeding `100,000` characters with a high ratio (> 30%) of non-ASCII characters.

## Configuration

The feature is controlled by the `SUSPICIOUS_DETECT_ENABLED` feature flag.

-   **Flag**: `SUSPICIOUS_DETECT_ENABLED`
-   **Default**: `false`

## Audit Events

When a suspicious payload is detected, a `SuspiciousPayloadObserved` event is emitted to the `ProvenanceLedger`. This is a non-blocking operation (audit only).

### Event Structure

```json
{
  "actionType": "SuspiciousPayloadObserved",
  "resourceType": "ProvenanceReceipt",
  "resourceId": "<receipt-id>",
  "payload": {
    "reason": "Extreme amount detected in field 'total'",
    "details": {
      "key": "total",
      "value": 2000000000,
      "threshold": 1000000000
    },
    "runId": "<run-id>"
  }
}
```

## Testing

Unit tests are located in `server/src/security/__tests__/suspiciousReceipt.test.ts`.

To run tests:

```bash
cd server
npx jest src/security/__tests__/suspiciousReceipt.test.ts
```
