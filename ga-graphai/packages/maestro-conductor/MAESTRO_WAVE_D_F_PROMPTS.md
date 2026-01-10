# Maestro Conductor — Waves D–F Codex Prompt Packet

## Global rules (apply to every PR produced from these prompts)

- Create **one atomic PR** only (small surface area, merges cleanly).
- Prefer **additive** changes; avoid broad refactors.
- Do **not delete failing tests**; fix or isolate properly.
- Any behavior change **must be behind a feature flag default OFF** (unless purely additive and non-breaking).
- Include in each PR: **PR title, summary, exact file list (approx paths), step-by-step plan, tests to add/run, acceptance checklist**.
- **CI must be green**; any new CI job must be fast and deterministic.
- Include **Non-goals / Out of scope** explicitly.
- Provide **exact local commands** to verify (lint/test/build or targeted commands).
- Do **not touch files outside your allowlist**; if a shared index needs edits, leave it to the Docs Indexer for that wave.

## Preconditions

- Waves A–C (schema drift, repo doctor, migration lint, error catalog; evidence verifier, provenance invariants, schema registry, goldens; release train skeleton, version tooling, nightly, fuzz) are assumed merged.
- If any prior waves are not merged, produce only a **safe, non-conflicting plan**; stop execution.

## Authority & allowlist references (governed)

- **Allowlists are authoritative:** `prompts/registry.yaml` defines the only allowed scope paths, domains, and operations per prompt id.
- **Execution gates:** `docs/ga/AGENT-RUN-LIFECYCLE.md` requires prompt hash registration, ATS scope declaration, and CI validation via `scripts/ci/verify-prompt-integrity.ts` and `scripts/ci/validate-pr-metadata.ts`.
- **Failure escalation:** `docs/ga/AGENT-FAILURE-MODES.md` mandates scope/operation compliance and governance escalation on policy violations.

## Merge verification gate (Deferred pending merge verification)

**Deferred pending merge verification** until A–C are confirmed merged with evidence in:

- `docs/roadmap/STATUS.json` and `PR_MERGE_LEDGER.md` (merge evidence), plus any A–C wave release notes if listed.
- If evidence is missing or inconsistent, stop at a **safe, non-conflicting plan** and do not generate executable prompts.

## Mission

Execute Waves **D–F** as **parallel, non-overlapping atomic PRs**. Assign work to agents **D1…F\*** with strict allowlists. Only Docs Indexer agents may touch README/docs index.

## Imputed implication ladder (Orders 1–23)

1. Governed allowlists bind every edit to registry scope.
2. Prompt hashes are immutable and must match registry entries.
3. ATS scope and allowed operations are declared before edits.
4. CI verifies prompt integrity and diff scope for every PR.
5. CI validates PR metadata and emits execution records.
6. Verification tiers are enforced with zero debt budget.
7. All changes are atomic and minimal surface area.
8. Feature flags default OFF for any behavior change.
9. Docs index edits are isolated to Docs Indexer only.
10. Non-goals prevent scope creep and reduce conflict risk.
11. Tests are deterministic and avoid flake amplification.
12. Warn-only workflows never block PRs without evidence.
13. Optional tests are disabled by default in PR CI.
14. No shared docs refactors; only additive docs are allowed.
15. Each wave has clear dependency ordering and sequencing.
16. Conflicts are prevented by allowlist non-overlap.
17. CI remains green by constraining runtime and scope.
18. Governance escalation is mandatory for scope expansion.
19. Merge choreography enforces D → E → F order.
20. Docs index updates land last to avoid churn.
21. Evidence artifacts are archived per governance rules.
22. Golden path smoke remains green for production readiness.
23. Final merge is deterministic, reproducible, and audit-ready.

## Output requirements

1. Wave D assignments (foundation follow-ons)
2. Wave E assignments (security hardening)
3. Wave F assignments (polish/devex)
4. Docs Indexer assignments (per wave)
5. Merge choreography between D→E→F
6. Copy/paste-ready Codex prompts in separate fenced blocks for each agent

## Wave D — Foundation follow-ons (run after A–C)

Order: **D2 depends on D1** if it verifies artifacts; **D4 optional** and may be gated to nightly.

- **D1 — Replay Simulator (Codex-47)**
  - **Allowlist:** `tools/replay-receipt.ts` **or** `scripts/replay-receipt.ts` (pick one), `test/replay-sim/**`, `docs/connectors/REPLAY_SIM.md` (new doc only)
  - **Non-goals:** No real DB/queue

- **D2 — Reproducible Build Check (Codex-50) [WARN-ONLY]**
  - **Allowlist:** `scripts/repro-check.(sh|ts)`, `test/repro-check/**`, `docs/release/REPRODUCIBLE_BUILDS.md` (new doc only), `.github/workflows/repro-check.yml` (new warn-only) **or** minimal safe update to `release-train.yml` only if strictly required and low-conflict
  - **Non-goals:** No build refactors

- **D3 — Attestation Skeleton Generator (Codex-51)**
  - **Allowlist:** `scripts/gen-provenance-attestation.ts`, `test/attestation/**`, `docs/security/ATTESTATIONS.md` (new doc only)
  - **Non-goals:** No signing, no KMS

- **D4 — Optional Integration Tests (Codex-76) [OFF by default]**
  - **Allowlist:** `integration-tests/**` (new), `docs/dev/INTEGRATION_TESTS.md` (new doc only), `.github/workflows/integration-tests.yml` (new workflow only; disabled by default)
  - **Non-goals:** No changes to main CI; no secrets

- **Docs Indexer D-DI**
  - **Allowlist:** `README.md` (docs links section only), `docs/index.md` or `docs/README.md` (links only)
  - Add links to: `docs/connectors/REPLAY_SIM.md`, `docs/release/REPRODUCIBLE_BUILDS.md`, `docs/security/ATTESTATIONS.md`, `docs/dev/INTEGRATION_TESTS.md` (if D4 lands)

## Wave E — Security hardening (run after D)

Order: **E1 early (warn-only)**, **E2–E4 parallel**, **E5–E6 parallel**.

- **E1 — Secrets scanning + log redaction wrapper (Codex-26) [WARN-ONLY scanning]**
  - **Allowlist:** `.gitleaks.toml`, `scripts/redact-log-line.ts` **or** `server/src/logging/redaction.ts` (choose one), `test/redaction/**`, `.github/workflows/secret-scan.yml` (new warn-only), `docs/security/SECRETS.md` (new doc only)
  - **Non-goals:** No logging framework refactor

- **E2 — Security Headers middleware (Codex-40) [flagged]**
  - **Allowlist:** `server/src/middleware/securityHeaders.ts`, `server/src/middleware/__tests__/securityHeaders.test.ts` **or** `test/security-headers/**`, `docs/security/HTTP_HARDENING.md` (new doc only)
  - **Non-goals:** No CSP rollout unless report-only + flagged

- **E3 — Payload size limits (Codex-41) [flagged]**
  - **Allowlist:** `server/src/middleware/payloadLimits.ts`, `server/src/middleware/__tests__/payloadLimits.test.ts` **or** `test/payload-limits/**`, `docs/security/PAYLOAD_LIMITS.md` (new doc only)
  - **Non-goals:** No breaking default limits (flag OFF)

- **E4 — Backpressure guard (Codex-60) [flagged]**
  - **Allowlist:** `server/src/backpressure/guard.ts`, `test/backpressure/**`, `docs/ops/BACKPRESSURE.md` (new doc only)
  - **Non-goals:** No real queue integration required

- **E5 — Suspicious payload heuristics + audit event (Codex-73) [flagged]**
  - **Allowlist:** `server/src/security/suspiciousReceipt.ts`, `test/suspicious/**`, `docs/security/SUSPICIOUS_PAYLOADS.md` (new doc only)
  - **Non-goals:** No blocking by default

- **E6 — Adaptive abuse/rate intelligence table (Codex-74) [flagged]**
  - **Allowlist:** `server/src/abuse/rateTable.ts` **or** `config/rateLimits.json` (choose one), `test/abuse/**`, `docs/security/ABUSE_LIMITS.md` (new doc only)
  - **Non-goals:** No Redis required

- **Docs Indexer E-DI**
  - **Allowlist:** `README.md` (docs links section only), `docs/index.md` or `docs/README.md` (links only)
  - Add links to: `docs/security/SECRETS.md`, `docs/security/HTTP_HARDENING.md`, `docs/security/PAYLOAD_LIMITS.md`, `docs/ops/BACKPRESSURE.md`, `docs/security/SUSPICIOUS_PAYLOADS.md`, `docs/security/ABUSE_LIMITS.md`

## Wave F — Polish / DevEx / UI confidence (run after E)

Order: **F1 first**, then remaining tasks parallel; **F-DI last**.

- **F1 — One-command verify (Codex-79)**
  - **Allowlist:** `Makefile` **or** `package.json` scripts (choose one), `scripts/verify/**` (new helper files only if needed), `docs/dev/VERIFY.md` (new doc only)
  - **Non-goals:** No long-running tasks; keep verify fast

- **F2 — Docs sitemap + link checker (Codex-78)**
  - **Allowlist:** `docs/SITEMAP.md`, `scripts/check-doc-links.ts`, `test/doc-links/**`, `.github/workflows/doc-links.yml` (new workflow only)
  - **Non-goals:** No external HTTP link checking unless already present

- **F3 — UI regression DOM snapshots (Codex-52)**
  - **Allowlist:** `ui-tests/regression/**` (new), `docs/ui/REGRESSION_TESTS.md` (new doc only)
  - **Non-goals:** No new heavy deps if avoidable; no screenshot suite

- **F4 — E2E smoke (Codex-53)**
  - **Allowlist option A (Playwright exists):** `e2e/smoke.spec.ts`, `.github/workflows/e2e-smoke.yml` (new workflow; manual/nightly trigger), `docs/ui/E2E_SMOKE.md` (new doc only)
  - **Allowlist option B (Playwright absent):** `scripts/http-smoke.ts`, `test/http-smoke/**`, `.github/workflows/http-smoke.yml` (new workflow; manual/nightly trigger), `docs/ui/E2E_SMOKE.md` (new doc only)
  - **Non-goals:** Do not add Playwright if absent; if absent, create node-based HTTP smoke within chosen allowlist

- **F5 — SDK typed clients (Codex-32)**
  - **Allowlist:** `packages/sdk/src/receipts.ts`, `packages/sdk/src/policyDecisions.ts`, `packages/sdk/test/**`, `docs/sdk/SDK_USAGE.md` (new doc only)
  - **Non-goals:** No breaking exports

- **F6 — CLI “doctor” command (Codex-33) (skip if repo-doctor already covers CLI needs)**
  - **Allowlist:** `packages/cli/src/commands/doctor.ts`, `packages/cli/test/**` **or** `packages/cli/src/commands/__tests__/doctor.test.ts`, `docs/dev/CLI_DOCTOR.md` (new doc only)
  - **Non-goals:** No touching other CLI commands

- **Docs Indexer F-DI**
  - **Allowlist:** `README.md` (docs links section only), `docs/index.md` or `docs/README.md` (links only)
  - Add links to: `docs/dev/VERIFY.md`, `docs/SITEMAP.md`, `docs/ui/REGRESSION_TESTS.md`, `docs/ui/E2E_SMOKE.md`, `docs/sdk/SDK_USAGE.md`, `docs/dev/CLI_DOCTOR.md` (if F6 lands)

## Merge choreography

- **Merge Wave D first:** D1 and D3 parallel; D2 after D1 only if it references replay artifacts (otherwise parallel, warn-only); D4 optional/disabled by default; D-DI last.
- **Merge Wave E next:** E1 early (warn-only); E2–E6 can be parallel if file surfaces do not overlap; E-DI last.
- **Merge Wave F last:** F1 first (verify command baseline), F2–F6 parallel, F-DI last.
- **Conflict avoidance:** Only Docs Indexers touch README/docs index; each agent must keep to allowlisted paths and create new docs rather than editing shared docs.
- **Validation workflow:** run `scripts/ci/verify-prompt-integrity.ts --prompt-hash <hash>` and `scripts/ci/validate-pr-metadata.ts --body <pr-body-path> --output artifacts/agent-runs/{task_id}.json` before merge readiness.

## Copy/paste-ready Codex prompts (one fenced block per agent)

```text
D1 — Codex Prompt: Connector Replay Simulator (Codex-47)

Objective:
ONE atomic PR adding a deterministic receipt replay simulator + tests to prove idempotency semantics without real DB/queue.

ALLOWLIST:
- tools/replay-receipt.ts (or scripts/replay-receipt.ts — pick one and stick to it)
- test/replay-sim/** (fixtures + unit tests)
- docs/connectors/REPLAY_SIM.md (new doc only)

Deliverables:
1) replay command:
   - args: --times N, --seed S, --input path (receipt JSON)
   - outputs JSON summary: {times, persistedCount, dedupedCount, errors[]}
2) Unit tests using mocks/fakes:
   - replay same receipt 5 times → exactly 1 persist call, 4 deduped (or stable 409 behavior)
   - deterministic output with seed
3) docs/connectors/REPLAY_SIM.md with usage and example output

Non-goals:
- No real DB
- No real queue
- No shared docs index edits

Local commands:
- Provide exact test command(s)

Acceptance checklist:
- [ ] Deterministic runs
- [ ] Tests assert idempotency semantics
- [ ] CI green
```

```text
D2 — Codex Prompt: Reproducible Build Sanity Check (Codex-50) [WARN-ONLY]

Objective:
ONE atomic PR adding a reproducibility sanity check that builds twice and compares hashes in a normalized way.

ALLOWLIST:
- scripts/repro-check.(sh|ts)
- test/repro-check/** (fixtures + unit tests)
- docs/release/REPRODUCIBLE_BUILDS.md (new doc only)
- .github/workflows/repro-check.yml (new warn-only workflow) OR minimal safe update to existing release-train.yml only if required

Deliverables:
1) repro-check script:
   - fast mode suitable for CI
   - uses temp dirs
   - normalizes timestamps/paths if needed (document what’s normalized)
2) Unit tests:
   - argument parsing
   - deterministic “fixture mode” where the script compares two known files
3) Warn-only CI job that runs on schedule or manual trigger (NOT required on every PR unless very fast)
4) docs/release/REPRODUCIBLE_BUILDS.md

Non-goals:
- No build refactors
- Do not fail main CI initially (warn-only)

Acceptance:
- [ ] Script deterministic in CI mode
- [ ] Warn-only job uploads artifacts/logs
- [ ] CI green
```

```text
D3 — Codex Prompt: Provenance Attestation Skeleton Generator (Codex-51)

Objective:
ONE atomic PR adding a provenance attestation JSON generator (no signing).

ALLOWLIST:
- scripts/gen-provenance-attestation.ts
- test/attestation/** (fixtures + unit tests)
- docs/security/ATTESTATIONS.md (new doc only)

Deliverables:
1) generator script outputs JSON with required fields:
   - buildType, invocation, materials, subject, metadata (timestamps), repo/ref if available
2) Unit test validates schema/required fields and determinism via fixture mode
3) docs/security/ATTESTATIONS.md describing use and how to attach to release artifacts

Non-goals:
- No signing
- No KMS
- No workflow changes (unless strictly required; prefer none)

Acceptance:
- [ ] Deterministic fixture mode
- [ ] CI green
```

```text
D4 — Codex Prompt: Optional Integration Tests (Codex-76) [OFF by default]

Objective:
ONE atomic PR adding optional integration tests (testcontainers or compose) that run only when explicitly enabled.

ALLOWLIST:
- integration-tests/** (new)
- docs/dev/INTEGRATION_TESTS.md (new doc only)
- .github/workflows/integration-tests.yml (new workflow only; disabled by default)

Deliverables:
1) One integration test:
   - spins up postgres (only if INTEGRATION_TESTS=1)
   - runs migrations
   - inserts a receipt and reads it back (or proves the table exists)
2) docs/dev/INTEGRATION_TESTS.md
3) Workflow that is manual-only or nightly-only, not per PR

Non-goals:
- No flakiness; include retries/timeouts carefully
- No secrets

Acceptance:
- [ ] Regular PR CI unchanged
- [ ] Deterministic when enabled
- [ ] CI green
```

```text
D-DI — Codex Prompt: Docs Indexer Wave D

Objective:
ONE atomic PR updating shared docs indexes to link Wave D docs.

ALLOWLIST:
- README.md (docs links section only)
- docs/index.md or docs/README.md (links only)

Add links to:
- docs/connectors/REPLAY_SIM.md
- docs/release/REPRODUCIBLE_BUILDS.md
- docs/security/ATTESTATIONS.md
- docs/dev/INTEGRATION_TESTS.md (if D4 landed)

Acceptance:
- [ ] Links only
- [ ] CI green
```

```text
E1 — Codex Prompt: Secrets Scan (warn-only) + Log Redaction Wrapper (Codex-26)

Objective:
ONE atomic PR adding warn-only secret scanning config and a minimal log redaction helper with tests.

ALLOWLIST:
- .gitleaks.toml (or equivalent)
- scripts/redact-log-line.ts OR server/src/logging/redaction.ts (choose ONE)
- test/redaction/** (unit tests)
- .github/workflows/secret-scan.yml (new warn-only workflow)
- docs/security/SECRETS.md (new doc only)

Deliverables:
1) Warn-only secret scan workflow
2) Redaction helper stripping common token/key patterns
3) Unit tests covering redaction and non-over-redaction
4) docs/security/SECRETS.md

Non-goals:
- No logging framework refactor

Acceptance:
- [ ] CI green
- [ ] Warn-only scanning does not fail PRs by default
```

```text
E2 — Codex Prompt: Security Headers Middleware (Codex-40) [flagged]

Objective:
ONE atomic PR adding baseline security headers behind a feature flag default OFF unless proven non-breaking.

ALLOWLIST:
- server/src/middleware/securityHeaders.ts
- test/security-headers/** (or server middleware test location)
- docs/security/HTTP_HARDENING.md (new doc only)

Deliverables:
1) Middleware sets safe headers (API-friendly)
2) Feature flag SECURITY_HEADERS_ENABLED (default OFF if uncertain)
3) Tests assert headers present when enabled

Non-goals:
- No strict CSP rollout unless report-only + flagged

Acceptance:
- [ ] Deterministic tests
- [ ] CI green
```

```text
E3 — Codex Prompt: Payload Limits (Codex-41) [flagged]

Objective:
ONE atomic PR enforcing request body size limits (esp webhooks) behind flag default OFF.

ALLOWLIST:
- server/src/middleware/payloadLimits.ts
- test/payload-limits/** (unit tests)
- docs/security/PAYLOAD_LIMITS.md (new doc only)

Deliverables:
1) Middleware for per-route payload size limit
2) Returns 413 with stable error code
3) Tests for oversized payload and normal payload

Non-goals:
- No default-breaking limits; keep flag OFF

Acceptance:
- [ ] CI green
- [ ] Clear errors
```

```text
E4 — Codex Prompt: Backpressure Guard (Codex-60) [flagged]

Objective:
ONE atomic PR adding a backpressure guard that rejects/defers ingestion when queue depth exceeds threshold (mocked), behind flag OFF.

ALLOWLIST:
- server/src/backpressure/guard.ts
- test/backpressure/** (unit tests with mocks)
- docs/ops/BACKPRESSURE.md (new doc only)

Deliverables:
1) Guard reads “depth provider” interface (mocked)
2) If over threshold → 503 with stable error code
3) Tests for below/above threshold

Non-goals:
- No real queue integration required

Acceptance:
- [ ] CI green
- [ ] Deterministic
```

```text
E5 — Codex Prompt: Suspicious Payload Heuristics + Audit Event (Codex-73) [flagged]

Objective:
ONE atomic PR adding suspicious receipt heuristics and emitting a non-blocking audit/provenance event, behind flag OFF.

ALLOWLIST:
- server/src/security/suspiciousReceipt.ts
- test/suspicious/** (fixtures + unit tests)
- docs/security/SUSPICIOUS_PAYLOADS.md (new doc only)

Deliverables:
1) Heuristics function returns reasons[]
2) When enabled, emits “SuspiciousPayloadObserved” event (mockable)
3) Tests for triggers and non-triggers

Non-goals:
- No blocking by default
- No ML

Acceptance:
- [ ] CI green
- [ ] Deterministic
```

```text
E6 — Codex Prompt: Abuse Limits Table + Adaptive Cooloff Stub (Codex-74) [flagged]

Objective:
ONE atomic PR adding a per-route abuse limits table and deterministic adaptive cooloff stub, behind flag OFF.

ALLOWLIST:
- server/src/abuse/rateTable.ts (or config/rateLimits.json — choose ONE)
- test/abuse/** (unit tests)
- docs/security/ABUSE_LIMITS.md (new doc only)

Deliverables:
1) Table defines route group → limits
2) Cooloff stub: deterministic based on counters (mock clock ok)
3) Tests for table lookup and cooloff behavior

Non-goals:
- No Redis
- No external dependencies

Acceptance:
- [ ] CI green
- [ ] Deterministic tests
```

```text
E-DI — Codex Prompt: Docs Indexer Wave E

Objective:
ONE atomic PR updating shared docs indexes to link Wave E docs.

ALLOWLIST:
- README.md (docs links section only)
- docs/index.md or docs/README.md (links only)

Add links to:
- docs/security/SECRETS.md
- docs/security/HTTP_HARDENING.md
- docs/security/PAYLOAD_LIMITS.md
- docs/ops/BACKPRESSURE.md
- docs/security/SUSPICIOUS_PAYLOADS.md
- docs/security/ABUSE_LIMITS.md

Acceptance:
- [ ] Links only
- [ ] CI green
```

```text
F1 — Codex Prompt: One-command Verify (Codex-79)

Objective:
ONE atomic PR adding `verify` command that runs lint + unit tests + fast build + schema drift check (if present), with clear output.

ALLOWLIST:
- Makefile OR package.json scripts (choose ONE)
- scripts/verify/** (new helper files only if needed)
- docs/dev/VERIFY.md (new doc only)

Deliverables:
1) `verify` command (fast)
2) docs/dev/VERIFY.md

Non-goals:
- No long-running integration tests; those stay nightly/optional

Acceptance:
- [ ] Deterministic
- [ ] CI green
```

```text
F2 — Codex Prompt: Docs Sitemap + Link Checker (Codex-78)

Objective:
ONE atomic PR adding docs sitemap and a fast markdown relative link checker in CI.

ALLOWLIST:
- docs/SITEMAP.md
- scripts/check-doc-links.ts
- test/doc-links/** (fixtures + tests)
- .github/workflows/doc-links.yml (new workflow only)

Deliverables:
1) docs/SITEMAP.md
2) link checker script + tests
3) CI job to run link checker

Non-goals:
- No external HTTP link checking unless already present

Acceptance:
- [ ] Runs < 10s
- [ ] CI green
```

```text
F3 — Codex Prompt: UI Regression DOM Snapshots (Codex-52)

Objective:
ONE atomic PR adding deterministic UI regression tests via DOM snapshots for 1–2 key components/pages.

ALLOWLIST:
- ui-tests/regression/** (new)
- docs/ui/REGRESSION_TESTS.md (new doc only)

Deliverables:
1) Snapshot tests (deterministic)
2) Docs explaining how to run

Non-goals:
- No screenshot suite
- No new heavy deps if avoidable

Acceptance:
- [ ] Deterministic snapshots
- [ ] CI green
```

```text
F4 — Codex Prompt: E2E Smoke (Codex-53) (only if Playwright exists)

Objective:
ONE atomic PR adding exactly one E2E smoke test OR a node HTTP smoke if Playwright absent.

ALLOWLIST (choose based on repo reality and stick to it):
Option A (Playwright exists):
- e2e/smoke.spec.ts
- .github/workflows/e2e-smoke.yml (new workflow; manual/nightly trigger)
- docs/ui/E2E_SMOKE.md (new doc only)

Option B (Playwright absent):
- scripts/http-smoke.ts
- test/http-smoke/** (unit test for parser/response shape)
- .github/workflows/http-smoke.yml (new workflow; manual/nightly trigger)
- docs/ui/E2E_SMOKE.md (new doc only)

Deliverables:
- One deterministic smoke test
- Workflow not required on every PR

Acceptance:
- [ ] Runs < 60s when triggered
- [ ] CI green
```

```text
F5 — Codex Prompt: SDK Typed Clients (Codex-32)

Objective:
ONE atomic PR adding typed SDK client modules for receipts and policy decisions.

ALLOWLIST:
- packages/sdk/src/receipts.ts
- packages/sdk/src/policyDecisions.ts
- packages/sdk/test/** (fetch mocks)
- docs/sdk/SDK_USAGE.md (new doc only)

Deliverables:
1) Typed client functions
2) Tests verifying request formation + error mapping
3) docs/sdk/SDK_USAGE.md

Non-goals:
- No breaking exports

Acceptance:
- [ ] CI green
- [ ] Deterministic tests
```

```text
F6 — Codex Prompt: CLI Doctor Command (Codex-33) (optional)

Objective:
ONE atomic PR adding a CLI doctor command (helpful diagnostics) without touching other CLI commands.

ALLOWLIST:
- packages/cli/src/commands/doctor.ts
- packages/cli/test/** (or commands test path)
- docs/dev/CLI_DOCTOR.md (new doc only)

Deliverables:
1) `cli doctor` command prints PASS/FAIL checks and exits non-zero on critical missing config
2) Tests for output and exit code
3) docs/dev/CLI_DOCTOR.md

Non-goals:
- No touching other CLI commands

Acceptance:
- [ ] CI green
- [ ] Deterministic
```

```text
F-DI — Codex Prompt: Docs Indexer Wave F

Objective:
ONE atomic PR updating shared docs indexes to link Wave F docs.

ALLOWLIST:
- README.md (docs links section only)
- docs/index.md or docs/README.md (links only)

Add links to:
- docs/dev/VERIFY.md
- docs/SITEMAP.md
- docs/ui/REGRESSION_TESTS.md
- docs/ui/E2E_SMOKE.md
- docs/sdk/SDK_USAGE.md
- docs/dev/CLI_DOCTOR.md (if F6 landed)

Acceptance:
- [ ] Links only
- [ ] CI green
```

---

**If additional “Wave G” acceleration is desired (auto PR labeling, semver checks, API compat warn-only, risk classifier, release notes generator), keep the same non-overlap constraints and allowlists.**
