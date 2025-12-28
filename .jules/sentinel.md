## 2025-12-28 - Webhook Signature Verification Bypass
**Vulnerability:** The AI webhook endpoint used `JSON.stringify(req.body)` as a fallback when `req.rawBody` was missing. This allows signature bypass because JSON serialization is not deterministic (whitespace/key order changes).
**Learning:** Always verify signatures against the *exact* raw bytes received. Never reconstruct the payload from parsed data.
**Prevention:** Ensure `express.json({ verify: ... })` middleware captures the raw buffer, and strict-check for its existence in the route handler. Fail closed if missing.
