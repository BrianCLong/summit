# Integrated Threat Modeling Framework

This framework makes lightweight, continuous threat modeling part of daily development. Every significant feature ships with an up-to-date model that allows reviewers to compare code changes against known threats and mitigations.

## Modeling approach
- **Primary model:** STRIDE (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege).
- **Additional lenses:**
  - **Supply chain & delivery** (build integrity, signing, provenance, dependency risk).
  - **Abuse & misuse** (LLM prompt abuse, workflow misuse, automation abuse, insider misuse).
  - **Data safeguards** (tenant isolation, privacy exposure, safety filters for generated content).
- **Threat statements:** expressed as attacker goal + method + impact (e.g., "Attacker uses stale tenant token to query another tenant's graph, exposing cross-tenant data").

## Required sections per threat model
Each feature threat model must contain the following sections:
- **Feature metadata:** Feature name, owner, last updated, review cadence.
- **Assets:** What needs protection (data, credentials, signing keys, workflows, audit trails).
- **Entry points:** Ingress paths attackers can reach (APIs, message topics, CLI, background schedulers, LLM prompts/tools).
- **Trust boundaries:** Where identity/authorization, network tiers, or data classification change.
- **Threats:** Grouped by STRIDE + additional lenses above.
- **Mitigations:** Implemented or planned controls mapped to each threat.
- **Residual risk:** Remaining concerns, compensating controls, and follow-ups.

## When to create or update a threat model
- **New feature or major change** to authentication, graph access, Maestro automation, LLM-powered actions, data pipelines, or tenant boundaries.
- **Protocol or control changes** (e.g., auth flows, signing, mTLS, key management, access policies).
- **Incidents or material findings** require immediate updates to the relevant threat model.
- **Staleness budget:** Models older than **90 days** must be reviewed before merge for affected features.

## Storage and naming
- Location: `docs/security/threat-models/<feature>.md`.
- Template: `docs/security/threat-models/template.md`.
- Index: `docs/security/THREAT_MODEL_INDEX.md` links every active model with owner and last updated timestamp.

## Review and workflow expectations
1. **During design/PR:** Contributors identify which feature areas are touched and confirm the associated threat model is present and current.
2. **Coverage check:** `scripts/security/check-threat-model-coverage.ts` detects changed feature areas, verifies the model exists, and flags staleness.
3. **CI signal:** `.github/workflows/threat-model-coverage.yml` posts a PR comment indicating coverage status (present, stale, or missing). Phase 1 is advisory and non-blocking.
4. **Sign-off:** Security owner for the feature acknowledges residual risk items and tracks follow-up actions in tickets or runbooks.

## Writing concise models
- Prefer bullet lists over prose and keep sections scannable.
- Link to existing runbooks, incident write-ups, or test plans instead of duplicating details.
- Capture both technical controls (authZ, rate limits, signing) and procedural controls (playbooks, monitoring, audits).
- Note detection/response coverage for material threats (alerts, dashboards, runbooks).

## Governance
- **Owners** maintain models for their areas and review at least quarterly.
- **Security Engineering** curates the template, coverage checker, and index; ensures new features onboard to this workflow.
- **Developers** reference the relevant model when proposing or reviewing changes; update mitigations/residual risks as controls evolve.
