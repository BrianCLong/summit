## 2025-03-02 - [CRITICAL] Fix SQL Injection in RTBF Audit Queries
**Vulnerability:** RTBFAuditService dynamically generated SQL count and sample queries by concatenating raw, user-provided `table` and `field` identifiers into the query string without sanitization.
**Learning:** Standard prepared statements parameterize values but do not parameterize table or column names. Developers might assume that because `value` is parameterized via `$1`, the `table` and `field` are also safe, creating an injection risk when identifier names come from API input.
**Prevention:** Always validate dynamically injected database identifiers against a strict allowlist regex (e.g., `/^[a-zA-Z0-9_]+$/`) to ensure they only contain safe characters before interpolating them into a SQL string.
