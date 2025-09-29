# Securiteyes IG — On-Call Cheat Sheet

## Modes & Commands
- **Angleton** (investigative, advisory). Command: `npx ts-node scripts/securiteyes/mode.ts angleton`
- **Dzerzhinsky** (strict containment, enforcing). Command: `npx ts-node scripts/securiteyes/mode.ts dzerzhinsky`

## Fast Path
1. Read the PR/Issue YAML packet from the bot.
2. If confidence is **high** and `risk_score ≥ 80`, switch to **Dzerzhinsky**, re-run the risk gate, and begin containment.
3. Otherwise remain in **Angleton**, gather ≥3 corroborating signals (diffs, telemetry, approvals), then remediate.
4. Check the **Polygraph** advisory score; request clarifications when ≥60 or confidence is `high`.

## Mapping Packet Fields to Actions
- **risk_score**
  - `≥80`: declare SEV2, freeze merges/deploys for impacted component, isolate workloads, rotate implicated secrets.
  - `50–79`: escalate to on-call lead, require explicit owner acknowledgement before merge/deploy.
  - `<50`: track via issue; schedule fix in sprint backlog.
- **confidence**
  - `high`: block merge/deploy in Dzerzhinsky mode; execute containment playbook.
  - `med`: hold merge until verification checks pass; request additional evidence.
  - `low`: expand telemetry, rerun gates, avoid blocking unless corroborated.
- **key_findings**: capture evidence links and attach to incident timeline.
- **recommended_actions**: apply smallest reversible diff first; ensure tests/policy updates accompany changes.
- **verification**: execute listed checks, record outputs, and attach to the incident document.
- **owners_notified**: ensure acknowledgement within SLA; escalate if silent.
- **polygraph**: treat as advisory. Use high scores to justify deeper review, never to assign blame.

## MTTA / MTTR Targets
- **MTTA**: <5 min (SEV2), <15 min (SEV3).
- **Containment**: <30 min for SEV2 events.
- **Eradication**: patch + rebuild within 4h (SEV2) / 24h (SEV3).
- **Recovery**: staged rollout 1% → 10% → 50% → 100% within 2h once eradication complete.

## Containment Quick-Start (Dzerzhinsky)
1. Freeze merges/deploys for the impacted scope.
2. Rotate suspect tokens/roles using pre-approved scripts.
3. Apply or tighten NetworkPolicies; isolate pods or scale canary workloads to zero.
4. Rebuild artifacts with verified provenance, regenerate SBOM, re-run risk gate.
5. Document each step and owner approvals.

## Investigation Quick-Start (Angleton)
1. Triangulate ≥3 independent signals (code diff, CI logs, behavior metrics, review graph).
2. Look for identical phrasing, timezone anomalies, unusual label churn, sudden approvals.
3. Log neutral findings with evidence and propose controls instead of blame.

## Approvals & Rollback Discipline
- Any access change, token rotation, or freeze requires named approver(s) and rollback plan.
- Keep mitigation diffs minimal, auditable, and reversible.
- Preserve forensics; never delete telemetry during active investigations.
