# Purpose Lock Charter

Summit operates as an institutional substrate whose mission is encoded, reviewable, and enforceable in code. This charter translates intent into executable guardrails to prevent mission drift during leadership turnover, reorganizations, or external pressure.

## Core Intent

- **Primary purpose:** Provide trustworthy, evidence-first intelligence analysis with resilient provenance, safety, and auditability.
- **Non-purposes:**
  - Monetization or growth strategies that weaken evidence requirements or safety posture.
  - Political or ideological manipulation, influence operations, or censorship campaigns.
  - Surveillance or targeting outside documented, consented, and lawful scopes.
  - Functionality that bypasses human accountability, provenance recording, or policy enforcement.
- **Red-lines:**
  - Removal or weakening of provenance, audit, or policy engines without explicit constitutional amendment.
  - Introducing privileged backdoors or hidden control channels.
  - Deployments without safety invariants, provenance logging, and abuse monitoring enabled.

## Execution Hooks

- **Governance linkage:** Purpose clauses must be referenced in `docs/governance/CONSTITUTION.md`, `agent-contract.json`, and any policy code touching identity, evidence, or distribution.
- **Policy-as-code binding:** Policies must import the Purpose Lock data contract to reject operations that conflict with non-purposes or red-lines.
- **Lifecycle checkpoints:**
  - Design reviews must cite the Purpose Lock ID and confirm no new non-purpose is introduced.
  - Change requests that alter scope must include an amendment ticket ID and debt delta.
  - Deploy gates block promotion if Purpose Lock references are missing from the release manifest.

## Amendment Path (Narrow)

- **Eligibility:** Only governance council members listed in the Custodianship Register may propose amendments.
- **Quorum:** ≥75% council approval plus security chair sign-off.
- **Cooling period:** 14-day public comment within the internal governance forum.
- **Re-validation:**
  - Run `scripts/ci/verify-prompt-integrity.ts` and `scripts/ci/validate-pr-metadata.ts` against the amendment.
  - Regenerate provenance proofs for the charter and downstream policies.
- **Immutable log:** Append decision evidence to the immutable audit log and publish a changelog entry in `docs/continuity/CHANGELOG.md` (if present).

## Drift Detection

- **Signals:** Declining evidence quality, bypassed policy checks, repeated exception use, or language softening of red-lines.
- **Automation:** The Drift Sentinel (see `semantic-drift.md`) must compare current policy text to the baseline Purpose Lock terms and raise alerts on variance.
- **Escalation:** Alerts create high-priority incidents routed to governance and security.

## Succession Safeguards

- **Handoff kit:** Every leadership transition must include the Purpose Lock summary, linked policies, and current risk waivers.
- **Temporary constraints:** Freeze non-critical feature releases during leadership handoff; require dual approval for purpose-impacting changes.
- **Post-handoff review:** Within 30 days, the new DRI re-affirms the Purpose Lock and documents any proposed amendments.
