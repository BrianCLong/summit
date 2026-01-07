## 2024-05-23 - SSRF Protection Pattern
**Vulnerability:** Unvalidated webhook URLs allowed Server-Side Request Forgery (SSRF) against internal services (e.g., localhost, metadata services).
**Learning:** Zod's `.url()` validation only checks format, not reachability or safety. Asynchronous validation is required for DNS resolution to detect internal IPs hidden behind public domains (DNS Rebinding risk remains but is mitigated for static checks).
**Prevention:** Use a robust URL validator that resolves DNS and checks against private IP ranges. Ensure validation middleware supports async operations (`schema.parseAsync`).
