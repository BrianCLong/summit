# Feature-Level Threat Modeling Framework (Phase 1)

This framework introduces lightweight, continuous threat modeling to every high-impact change. It prioritizes clarity and speed over exhaustive documents while maintaining a repeatable structure that can scale with the platform.

## Model and Categories

- **Primary model:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
- **Supplementary lenses:**
  - **Supply chain / dependency risks** (malicious packages, build tampering).
  - **Abuse and misuse** (prompt/automation abuse, unsafe defaults, mass actions, data exfiltration via outputs).
  - **Safety and policy controls** (governance, RBAC/ABAC, tenant isolation, rate limits, human-in-the-loop where required).

## Required Sections for Each Feature Model

Each threat model **must stay concise (1–2 pages)** and include these sections in order:

1. **Metadata**: Feature name, owner, service area, `last-updated`, review cadence.
2. **Assets**: What must be protected (data, credentials, models, audit logs, pipelines, user actions).
3. **Entry Points**: How an actor interacts with the feature (APIs, UIs, events, schedulers, admin tools, automation hooks).
4. **Trust Boundaries**: Where data/identity/context crosses isolation lines (tenant barriers, network segments, third-party services, privileged planes).
5. **Threats**: Concise bullets tagged with STRIDE (and the supplementary lenses) describing attacker goals and paths.
6. **Mitigations**: Implemented safeguards and how they are enforced (controls, monitoring, rate limiting, approvals, policies, red-teaming).
7. **Residual Risk**: What remains, why it is accepted, and planned follow-ups.

## Process Expectations

- **When to update**: On any PR that alters a covered feature’s code paths, controls, or dependencies—or every 90 days at minimum.
- **Ownership**: Each model lists an accountable owner/team. PR reviewers ensure updates when a touched feature’s model is missing or stale.
- **Brevity**: Avoid narrative text; use short bullets and tables. Link to detailed design docs rather than duplicating.
- **Traceability**: Reference the model in design docs and in PR descriptions for high-risk features.
- **Validation**: The coverage checker surfaces missing/stale models on PRs (advisory in Phase 1).

## Workflow for Authors and Reviewers

1. **Identify feature impact** (auth, multi-tenant IntelGraph, Maestro automation, LLM-powered actions, or new high-risk surface).
2. **Open the feature model** in `docs/security/threat-models/` and confirm metadata is current (`last-updated`, owner).
3. **Capture changes**: Update assets/entry points/trust boundaries, add new threats and mitigations, and note residual risk.
4. **Link evidence**: Reference implemented controls (tests, policies, configs) to keep models actionable.
5. **Submit PR**: Include a brief note like “Threat model: updated `docs/security/threat-models/auth.md`.”
6. **Reviewer checklist**: Confirm the model exists, is ≤90 days old, reflects the change, and has explicit residual risk.

## Review Cadence

- **Quarterly sweep**: Security leads review all models, refresh stale entries, and add newly scoped features.
- **Post-incident**: Update the relevant model within 48 hours of root-cause analysis to capture new threats and mitigations.

## Adding a New Feature Model

1. Copy `docs/security/threat-models/template.md` into the same folder and rename it to the feature.
2. Fill out metadata and required sections with concise bullets.
3. Add the model to `docs/security/THREAT_MODEL_INDEX.md` with owner and `last-updated`.
4. Ensure the coverage checker maps the feature to the correct directories so PRs surface stale/missing models.

## Scope Notes

- Phase 1 is **advisory** (non-blocking). Future phases may gate merges once coverage is steady.
- Keep models version-controlled; avoid external documents or long PDFs.
- Focus on high-risk areas first: authentication/authorization, tenant isolation, Maestro automation, IntelGraph queries, and LLM-powered actions.
