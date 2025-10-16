# Access + Proof Execution Plan (Oct 3–17, 2025)

## Decision Summary

- **Go**: Ship the "Access + Proof" program within 14 days covering Minimal Mode, Offline Core (read/query with outbox), Pretrained Pull, and CI Benchmarks.
- **Rationale**: Fastest route to unlock adoption lift and create credible demos. All subsequent scope depends on the success of these proofs.

## Execution Timeline & Owners

### Week 1 — "Boot & Prove" (Oct 3–10)

Owners: Platform (@platform-lead), AI/Models (@ml-lead), Docs/Community (@community-maintainer)

1. **Minimal Mode (compose + flags)**
   - **DoD**: `deploy/docker-compose.min.yml`; `INTELGRAPH_PROFILE=minimal`; `features.toml` disables vector/CV/speech.
   - **Measure**: peak RAM ≤ 4 GB; demo time-to-first-value (TTFV) ≤ 15 min (script emits timestamp delta).

2. **Pretrained Pull**
   - **DoD**: `make init-ai` pulls signed bundle; bundle includes `MODEL_CARD.md` + license; SHA256 verification on download.
   - **Measure**: fresh clone → demo succeeds offline in ≤ 15 min.

3. **Performance Benchmarks in CI**
   - **DoD**: k6 smoke on `/healthz` + 2 hot endpoints; CI artifact auto-updates README perf table; PR fails on >10% p95 regression.
   - **Measure**: badge visible; baseline JSON stored.

4. **Use-Case Intake**
   - **DoD**: pinned "Use Case Submission" issue template, triage labels, and weekly automation summarizing new entries.
   - **Measure**: ≥ 10 valid submissions by Oct 10.

### Week 2 — "Resilience & Signal" (Oct 11–17)

1. **Offline Core MVP**
   - **DoD**: SQLite driver + Redis outbox; background sync with backoff; conflict policy = last-write-wins with provenance tag.
   - **Tests**: end-to-end "air-gap" script toggles WAN; queue drains on reconnect.
   - **Measure**: 100% green CI e2e; zero data loss on the happy path.

2. **Case Study 001 (Synthetic)**
   - **DoD**: `docs/case-studies/001.md` and 2-minute screen capture; dataset + runbook reproducible under Minimal profile.
   - **Measure**: demo script generates 10 nodes / 10 edges / 2 claims with sources; video link live.

3. **Governance Lite**
   - **DoD**: `MAINTAINERS.md`, `CODEOWNERS`, `CODE_OF_CONDUCT.md`, DCO check; `RELEASE.md` with rollback + disclosure checklist.
   - **Measure**: all new PRs require DCO; CODEOWNERS enforced on `/deploy`, `/models`, `/security` paths.

## Exit Criteria (by Oct 17)

- TTFV ≤ 15 min.
- p95 latency (Minimal profile demo endpoints) ≤ 1 s.
- ≥ 10 use-case submissions.
- Model bundle signed + verified.
- Offline e2e suite green.

## KPI Guardrails & Automation

| KPI                  | Target              | Source of Truth                     |
| -------------------- | ------------------- | ----------------------------------- |
| Time-to-First-Value  | ≤ 15 min            | `make demo-minimal` prints duration |
| Demo p95 (Minimal)   | ≤ 1,000 ms          | k6 CI artifact                      |
| Peak RAM (Minimal)   | ≤ 4 GB              | `/metrics` sample during demo       |
| Use-Case Submissions | ≥ 10                | GitHub issues with `use-case` label |
| Model Provenance     | 100% bundles signed | CI verification step                |
| Regression Block     | PR failure on >10%  | CI comparator                       |

## Critical Observation Guardrails

### A. Avoid Badge Fatigue (Trustworthy Gamification)

- **Reward only value**: Issue badges only when a labeled PR closes an issue tied to an approved roadmap or milestone.
- **Small influence, not power**: Badge holders ("Docs Hero", "Bug Slayer") receive one quarterly vote to elevate a backlog item into the next grooming cycle; no merge authority granted.
- **Spam brakes**: Automation ignores PRs below LOC threshold unless labeled `docs` or `infra`; throttle duplicate badge awards per month.

### B. Signal-over-Noise Use-Case Triage

- **Rubric**: Score 0–3 each for repeatability, breadth, feasibility (≤ 8 weeks), governance risk (reverse-scored).
- **SLA**: Initial triage within 72 hours; publish monthly "top 5" summary; every item links to a Decision node (context, options, decision, risks).

### C. Interop Minimal Contract

- **Export-first API**: Provide STIX 2.1 export at `/export/stix` for entities {Person, Org, Domain, Addr} and relations {owns, affiliated, resolves_to}.
- **Versioning**: Require `Accept: application/stix+json; version=1`; guarantee non-breaking behavior for 90 days; signal deprecations via response header.
- **Maltego starter**: Deliver a read-only transform that calls `/export/stix?entity=<id>`.

## Security & Supply Chain Requirements

1. **Model Bundle Manifest (CI-enforced)**

   ```json
   {
     "name": "intelgraph-nlp-minimal",
     "version": "2025.10.0",
     "sha256": "<bundle-sha>",
     "artifacts": [
       {
         "path": "nlp/entity-extractor.onnx",
         "sha256": "...",
         "license": "Apache-2.0",
         "origin": "hf://..."
       },
       {
         "path": "tokenizer.json",
         "sha256": "...",
         "license": "Apache-2.0",
         "origin": "..."
       }
     ],
     "slsa": { "provenance": "attached.json" },
     "sbom": { "spdx": "sbom.spdx.json" },
     "tested_against": { "api": "vX.Y.Z", "profile": "minimal" }
   }
   ```

   - **Policy**: Refuse to run if hash or license verification fails; log a provenance claim.

2. **Threat-Model Hotspots & Controls**
   - Unsigned bundles → enforce cosign verification; fail closed.
   - Plugin path RCE → run transforms in sandboxed process, allowlist endpoints, 10 s execution timeout.
   - Offline cache exfiltration → encrypt SQLite at rest (env-provided key); redact PII on Minimal demo exports.
   - Metrics leakage → require authentication on metrics endpoint for non-dev builds.

## Docs & UX First-Run Expectations

- **README stopwatch**: Provide a copy/paste one-liner that records start/stop times and suggests remedies when RAM < 4 GB.
- **Troubleshooting**: Map the top 10 errors to fixes and link the guide from CI failures.
- **Secure by default**: Minimal profile binds to localhost and ships with a synthetic, non-PII demo dataset.

## Issue Backlog (Ready for Ticketing)

1. A1 – Minimal profile & flags (Platform) — DoD above.
2. A2 – Pretrained bundle & verification (AI/Models).
3. B1 – k6 CI & regression gate (Platform).
4. B2 – Use-case template & weekly summary automation (Community).
5. B3 – Offline core (SQLite + outbox + sync) (Platform).
6. C1 – Case Study 001 (Docs).
7. C2 – Governance lite pack & DCO (Community).
8. C3 – STIX export & Maltego read-only transform (Interop).
9. C4 – Gamification action with value rubric (Community).

## Budget Constraints

- Bundled storage/egress: $25–$50 per month (HF or S3-compatible).
- CI minutes for k6 expansion: +$10–$30 per month.
- All other efforts rely on scoped MVP labor within existing teams.

## Next PR Wave Expectations

- Green performance badge with README table auto-populated from CI artifacts.
- Model bundle manifest checked into `models/` with CI signature verification.
- Offline e2e test that disables WAN, supports query, and syncs on reconnect.
- Pinned Use-Case issue with ≥ 10 submissions and a monthly summary comment.

Meeting these objectives by Oct 17 translates the strategic insights into measurable adoption gains and sets the stage for Maltego export and contributor spotlight work without incurring additional process debt.
