# Security Remediation Sprint (Phase X)

## PR #17431 — ReDoS Fix (Business Rules)
- **Problem:** regex-based parsing vulnerable to pathological inputs (ReDoS).
- **Fix:** replace regex parsing with deterministic parsing (linear-time), remove catastrophic backtracking risk.
- **Proof:** added negative fixtures (pathological payloads) + execution-time assertions; target **sub-millisecond** runtime on worst-case fixtures.
- **Verification:** CI runs security tests; includes evidence bundle entry `EVD-...-REDOS-...` (see Evidence Index).

## PR #17438 — Hono ErrorBoundary XSS Fix (Supply Chain)
- **Vuln:** CVE-2026-24771 impacts `hono/jsx` `ErrorBoundary` prior to **4.11.7**; fixed in **4.11.7**.
- **Fix:** bump `hono` to **4.11.7** in root manifest; enforce via `pnpm.overrides` to pin across workspace.
- **Proof:** `hono-version-gate` verifies lockfile contains **no** `hono@<4.11.7` after install; emits Evidence Bundle `HONO-ERRBOUNDARY-XSS`.
- **Closure:** mapped to Dependabot alert #2298 (see PR description).

## Merge Order
1. Merge PR #17438 (dependency bump + overrides)
2. Merge supply-chain proof gate + evidence bundle PR
3. Merge docs updates if separated
