Below are **ready‑to‑paste docs** to incorporate the operational aspects you flagged. Each subsection is a full file (or patch block) you can drop into the repo.

---

## 1) `README.md` — Patches

Append under your existing **CI Evidence & Guardrails** section.

```md
### Badges
[![CI](https://github.com/<org>/<repo>/actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
![Trajectory Gate](https://img.shields.io/badge/trajectory-%E2%89%A5%2095%25-green)
![Grounding Gate](https://img.shields.io/badge/grounding-%E2%89%A5%2090%25-green)

### What the CI Gates Enforce
- **Trajectory Golden‑Set**: ReAct trace invariants; JUnit + JSON + Markdown evidence.
- **Grounding Verifier**: citation presence (URL + quote), SARIF in Code Scanning.
- **Canary Gate (pre‑deploy)**: blocks when error‑budget remaining < 60%, replica lag > 60s, or cost > 80% of budget.

### Evidence Artifacts
- `reports/junit-trajectory.xml`, `reports/trajectory-report.json`, `reports/trajectory-summary.md`
- `reports/grounding.sarif`, `reports/grounding-report.json`, `reports/grounding-summary.md`
- Optional: `evidence/slo/*.json`, `evidence/cost/*.json` consumed by canary gate
```

---

## 2) `CONTRIBUTING.md` — New Sections

Create (or append) the following sections.

```md
## Post‑Merge Checks (Main)
After a PR merges to `main`, maintainers verify:
1. **CI Evidence artifact** `ci-evidence-<sha>` is present and archived.
2. **Grounding SARIF** uploaded with 0 new warnings, or triaged with labels.
3. **Canary Gate** job passed with no tripwires.

## Threshold Tuning Policy
- `TRAJ_MIN_PASS_RATE`: start **0.95** → raise to **0.98** once the suite has ≥ 25 stable cases.
- `GROUNDING_MIN_SCORE`: start **0.90** → raise to **0.95** after two green weeks.
- `GROUNDING_MAX_GAPS`: keep at **0**. Temporary exceptions require a feature flag and issue link.

## RACI for CI Gates
- **MC** — owns thresholds & evidence policy, approves changes.
- **SRE** — owns `canary-gate.js` inputs (SLO/Cost evidence), monitors lag & error‑budget.
- **Security** — monitors SARIF, tunes grounding cases.
- **QA** — curates trajectory golden‑set growth and flake triage.

## PR Checklist (Contributor)
- [ ] Added/updated trajectory YAMLs and/or grounding cases as needed.
- [ ] `npm run validate:trajectory` and `npm run validate:grounding` green locally.
- [ ] If touching canary‑relevant code, included a short note on expected SLO/cost impact.
```

---

## 3) Runbooks (add under `docs/runbooks/`)

### `docs/runbooks/github-protections.md`
```md
# GitHub Protections

## Branch Protection (main)
- Require status checks to pass: `build-test-validate`, `canary-gate`.
- Require code scanning results (SARIF upload present).
- Require linear history; dismiss stale approvals on new pushes.

## Environments
- **staging**: required reviewers = SRE, Security; wait timer 10m; secrets scoped.
- **production**: required reviewers = MC, SRE; wait timer 30m; secrets scoped; manual approval required.

## Audit
Export protection rules via the GitHub API and save to `evidence/gh-protections/<date>.json` for audits.
```

### `docs/runbooks/evidence-and-provenance.md`
```md
# Evidence & Provenance

## What to Persist
- CI artifacts under `reports/` → copy to `evidence/ci/<date>/<sha>/`.
- Checksums: compute SHA‑256 for each evidence file; store as `manifest.json`.

## Manifest Entry (example)
```json
{"kind":"ci-evidence","sha":"<sha>","paths":["reports/junit-trajectory.xml","reports/grounding.sarif"],"hash":"<sha256>"}
```

## Provenance Tips
- Attach CI evidence to release assets on tag cut (e.g., `v0.3.1-mc`).
- Keep immutable copies for compliance reviews.
```

### `docs/runbooks/supply-chain-hardening.md`
```md
# Supply‑Chain Hardening

## SBOM (CycloneDX)
```bash
npm i -D @cyclonedx/cyclonedx-npm
npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json
```
Add `sbom.json` to the `ci-evidence` artifact.

## Provenance
- Plan SLSA provenance attestation in release workflow.
- Sign container images (e.g., cosign) and attach signatures to releases.
```

---

## 4) `docs/index.md` — Navigation (optional)

```md
# Project Docs
- [CI Evidence & Guardrails](../README.md#ci-evidence--guardrails)
- Runbooks
  - [GitHub Protections](runbooks/github-protections.md)
  - [Evidence & Provenance](runbooks/evidence-and-provenance.md)
  - [Supply‑Chain Hardening](runbooks/supply-chain-hardening.md)
- [Contributing](../CONTRIBUTING.md)
```

---

## 5) `Makefile` (optional helpers)

```makefile
.PHONY: sbom evidence

sbom:
	npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json

# Promote CI reports into evidence folder
EVIDENCE_DIR?=evidence/ci/$(shell date +%Y-%m-%d)/$(shell git rev-parse --short HEAD)

evidence:
	mkdir -p $(EVIDENCE_DIR)
	cp -r reports/* $(EVIDENCE_DIR) || true
	shasum -a 256 $(EVIDENCE_DIR)/* > $(EVIDENCE_DIR)/SHA256SUMS || true
```

---

### Adoption Notes
- Keep the README concise; point to runbooks for detailed procedures.
- Treat thresholds as a living policy—raise as suites mature, with short PRs that include rationale.
- Ensure runbooks are part of the evidence bundle to satisfy auditability.

