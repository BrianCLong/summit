# CBM Data Handling

Rules:
* **Never log:** access tokens, private messages, unique user identifiers, raw scraped HTML if license unclear
* **Retention default:** artifacts 90 days, drift baselines 180 days, metrics 1 year
* **PII:** deny-by-default; only allow if explicitly configured and legally permissible (off by default)
