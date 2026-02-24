# UI Fuzz Probe (Bombadil-Inspired)

## Summit Readiness Assertion
This workstream is governed by the Summit Readiness Assertion and MAESTRO threat modeling requirements. See `docs/SUMMIT_READINESS_ASSERTION.md` and `docs/security/threat-modeling-framework.md` for authoritative definitions.

## Purpose
Provide a deterministic, CI-safe UI exploration probe that produces reproducible artifacts and surfaces property violations.

## Minimal Winning Slice (MWS)
- Deterministic, seeded exploration against a local UI target.
- Artifacts: `report.json`, `metrics.json`, `stamp.json`, optional `trace.ndjson`.
- Allowlist enforcement and data redaction.

## Work Breakdown Structure (WBS)
1. **Core Runner**
   - Config parser and CLI interface.
   - Deterministic RNG and action explorer.
   - Artifact writer and hash stamping.
2. **Properties**
   - No uncaught page errors.
   - No console error entries (allowlist supported).
   - Eventually idle (network idle within bounded time).
3. **Security & Determinism**
   - Deny-by-default allowlist.
   - Redaction and never-log list enforcement.
   - Stable trace hashing.
4. **CI Smoke**
   - Headless mode execution with `--exit-on-violation`.
   - Artifact upload.
5. **Drift Monitoring**
   - Scheduled run with rolling baseline comparison.

## Usage
Local run (headless, deterministic):

```bash
pnpm ui-fuzz:smoke
```

Override target and seed:

```bash
UI_FUZZ_BASE_URL=http://localhost:3000 \
UI_FUZZ_ALLOWLIST=localhost \
UI_FUZZ_SEED=7331 \
pnpm ui-fuzz:smoke
```

## Outputs
- `artifacts/ui_fuzz/report.json`
- `artifacts/ui_fuzz/metrics.json`
- `artifacts/ui_fuzz/stamp.json`
- `artifacts/ui_fuzz/trace.ndjson` (optional)
