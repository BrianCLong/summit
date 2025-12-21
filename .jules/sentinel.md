# Sentinel Journal

## 2025-10-22 - Missing Webhook Signature Verification
**Vulnerability:** The GitHub webhook endpoint (`/api/webhooks/github`) accepted requests without verifying the `X-Hub-Signature-256` header, allowing attackers to spoof events and trigger internal logic (e.g., ticket linking).
**Learning:** `express.json()` consumes the request body stream, making standard signature verification impossible downstream unless the raw buffer is captured explicitly.
**Prevention:** Configure `express.json({ verify: ... })` to capture `req.rawBody` globally or for specific routes, and enforce HMAC verification middleware on all public webhook endpoints.
