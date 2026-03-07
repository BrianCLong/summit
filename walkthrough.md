# Walkthrough

## Security Remediation Sprint (Phase X)

### PR #17431 — ReDoS Fix (Business Rules)
- **Problem:** Regex-based parsing allowed pathological inputs to trigger backtracking overhead.
- **Fix:** Replaced regex parsing with deterministic parsing to keep runtime linear.
- **Proof:** Security fixtures cover pathological payloads with execution-time assertions; sub-millisecond worst-case target is **Deferred pending measurement capture**.
- **Verification:** CI runs the security tests; evidence entry recorded in the Evidence Index.

### PR #17438 — Hono ErrorBoundary XSS Fix (Supply Chain)
- **Vuln:** CVE-2026-24771 impacts `hono/jsx` `ErrorBoundary` prior to **4.11.7**; fixed in **4.11.7**.
- **Fix:** `hono` pinned to **4.11.7** in the root manifest and enforced via `pnpm.overrides` to prevent workspace downgrades.
- **Proof:** `hono-version-gate` verifies the lockfile contains **no** `hono@<4.11.7` after install and emits the Evidence Bundle `HONO-ERRBOUNDARY-XSS`.
- **Closure:** Mapped to Dependabot alert #2298 in the PR narrative.

### Merge Order
1. Merge PR #17438 (dependency bump + overrides).
2. Merge supply-chain proof gate + evidence bundle PR.
3. Merge docs updates if separated.

### Verification Commands
```bash
node --test tools/security/verify_hono_lockfile.test.mjs
node tools/security/verify_hono_lockfile.mjs pnpm-lock.yaml
```

## Verify in 30s — Evidence-Trail Peek
1. Open the Copilot panel and ensure the feature flag `features.evidenceTrailPeek` is enabled for the tenant.
2. Load an answer with a valid `answerId` and open the Evidence tab to confirm the overlay is visible.
3. Toggle **Answer-Surface Minimizer** and confirm only the top three verifiable claims are shown with deterministic badges.
4. Click a badge to open the linked evidence artifact and confirm it resolves to a provenance-backed endpoint for Audit review.
