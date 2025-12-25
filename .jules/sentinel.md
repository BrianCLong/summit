# Sentinel Journal

## 2025-12-25 - Unauthenticated Webhooks & Raw Body Capture

**Vulnerability:** The `/api/webhooks/github` endpoint was accepting requests without verifying the `X-Hub-Signature-256` header, allowing anyone to spoof PR events and potentially trigger internal workflows or corrupt ticket data.
**Learning:** The global `express.json()` middleware consumed the request stream, making it impossible to verify signatures in downstream route handlers because the raw body was lost. This is a common pattern in Express apps where global middleware interferes with specific security requirements.
**Prevention:** Modified `server/src/app.ts` to capture `req.rawBody` within the `express.json()` `verify` callback. This enables any downstream route to perform cryptographic verification of the original payload. Future webhook implementations should always verify signatures and ensure `rawBody` is available.
