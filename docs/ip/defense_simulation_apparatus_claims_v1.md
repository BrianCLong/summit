# Defense Simulation Apparatus Claims — v1

<!--
DEPENDENCY NOTE:
Claims in this file (S271–S330) are part of the "next and more" ITEM normalization block.
They assume that claims S1–S270 exist as dependencies in parallel development branches
(e.g., feat/ip-expansion-*) that have not yet been merged to main.
-->

## A) MASTER PLAN

### 1.0 ITEM normalization
* **ITEM:** “next and more” = continue with **two consecutive +30 blocks** per family (i.e., **+60 new dependents per family**) to accelerate growth.
* **Output:** S271–S330 (60 claims)

### 1.1 Drafting goals
Add six continuation-ready moat clusters (three per +30 block), all defense/governance oriented:
**Block 1 (S271–S300):**
1) **Policy rule provenance + per-rule explainability**
2) **Credentialed approvals + delegation + revocation**
3) **Adversarial data poisoning defenses** (input integrity, robustness checks)

**Block 2 (S301–S330):**
4) **Cross-model consensus + disagreement handling** (safer triage + uncertainty)
5) **Semantic canarying + harm-minimization constraints** (publish-limiting via semantic checks)
6) **Disaster recovery + continuity-of-operations for governance/audit** (immutable backups, recovery proofs)

### 1.2 Safety posture
* Poisoning defenses and cross-model consensus are defensive.
* Semantic canarying is constrained by governance and aims to minimize harm.
* DR/COOP claims improve reliability and accountability.

---

## B) SUB-AGENT PROMPTS (A–E)

### A) Rule-provenance continuation pack
Create an independent claim on policy rule provenance, explainability, and rule-level audits, with 25 dependents drawn from S271–S280.

### B) Credentialed approvals continuation pack
Create an independent claim on approval credentials, delegation, revocation, and step-up authentication, with 25 dependents from S281–S290.

### C) Poisoning defenses continuation pack
Create an independent claim on poisoning detection, source reliability drift, quarantine, and robustness checks, with 25 dependents from S291–S300.

### D) Cross-model consensus + semantic canarying continuation pack
Create an independent claim on model disagreement handling + semantic canary constraints + safe fallbacks, with 25 dependents from S301–S320.

### E) DR/COOP continuation pack
Create an independent claim on immutable audit backups + recovery proofs + continuity safe modes, with 25 dependents from S321–S330.

---

## C) CONVERGENCE PROTOCOL
1. **Rule-level provenance:** every decision can cite rule IDs/versions and the source/author of rules.
2. **Credentialed approvals:** approvals are cryptographically bound and revocable; step-up auth for high-risk actions.
3. **Poisoning defense:** quarantine suspicious inputs; reduce reliance on low-reliability sources; log quarantines.
4. **Cross-model consensus:** treat disagreement as uncertainty; prefer monitoring-only when disagreement is high.
5. **Semantic canarying:** block or constrain actions if semantic safety checks fail; record safety proofs.
6. **DR/COOP:** preserve audit integrity under outages; fail closed for external publish if governance/audit unavailable.

---

## D) VALIDATOR REFERENCE
Implementation of these claims is verified by:
`scripts/governance/validate_defense_claims.ts`

---

# ADDITIONAL DEPENDENT CLAIMS — SIMULATION APPARATUS (S271–S330)

## Block 1 / Cluster 1: Policy rule provenance + per-rule explainability (S271–S280)

S271. The apparatus of claim S1, wherein governance policies comprise governance rules each having rule provenance metadata comprising at least one of author identifier, approval identifier, effective date, or jurisdiction scope.
S272. The apparatus of claim S271, wherein the policy decision includes identifiers of governance rules evaluated and an outcome per rule indicating satisfied, violated, or not applicable.
S273. The apparatus of claim S271, wherein the apparatus generates a rule-level explanation artifact comprising a minimal subset of rules that determined an allow, deny, or modify decision used in ranking.
S274. The apparatus of claim S273, wherein the rule-level explanation artifact is recorded in an audit log linked to a policy bundle hash and a candidate defense action identifier.
S275. The apparatus of claim S271, wherein the apparatus detects rule drift by comparing outcomes per rule across time for a same defense action type and records a drift indicator.
S276. The apparatus of claim S275, wherein the apparatus excludes external publishing actions from ranking when rule drift exceeds a threshold absent approval.
S277. The apparatus of claim S271, wherein modify decisions include a rule-to-edit mapping indicating which governance rule each modification satisfies and the apparatus re-simulates modified actions.
S278. The apparatus of claim S271, wherein the apparatus generates a policy trace artifact comprising an ordered list of rule evaluations and intermediate constraint values used in ranking.
S279. The apparatus of claim S278, wherein the policy trace artifact excludes never-log fields and is stored as a redacted artifact linked to snapshot hash.
S280. The apparatus of claim S271, wherein the apparatus denies producing output permitted defense actions under governance rules lacking rule provenance metadata absent approval.

## Block 1 / Cluster 2: Credentialed approvals + delegation + revocation (S281–S290)

S281. The apparatus of claim S1, wherein approval tokens are cryptographically signed by an approver credential and the apparatus verifies a signature prior to forwarding an external publishing action.
S282. The apparatus of claim S281, wherein the apparatus supports delegated approvals using a delegation credential having a bounded scope comprising at least one of permitted channels, time windows, or risk thresholds.
S283. The apparatus of claim S282, wherein the apparatus denies forwarding an external publishing action when an approval token exceeds the bounded scope.
S284. The apparatus of claim S281, wherein the apparatus maintains a revocation list for approver credentials and denies forwarding an external publishing action when a signing credential is revoked.
S285. The apparatus of claim S1, wherein the apparatus requires step-up authentication for approvals of actions exceeding a risk threshold and records a step-up authentication artifact.
S286. The apparatus of claim S1, wherein the apparatus outputs a dual-control requirement for actions exceeding a risk threshold, requiring two independent signed approval tokens.
S287. The apparatus of claim S286, wherein the apparatus denies forwarding an action when the two independent signed approval tokens share a same credential or delegated scope.
S288. The apparatus of claim S1, wherein the replay manifest includes approver credential identifiers, delegation scope identifiers, and revocation status identifiers in redacted form.
S289. The apparatus of claim S1, wherein the apparatus enforces separation-of-duties by requiring that a proposer credential differs from an approver credential.
S290. The apparatus of claim S1, wherein the apparatus records credential verification failures and denial reasons in an append-only audit log.

## Block 1 / Cluster 3: Adversarial data poisoning defenses (S291–S300)

S291. The apparatus of claim S1, wherein the apparatus detects potential data poisoning by identifying anomalous shifts in source reliability scores or embedding distributions for simulation inputs.
S292. The apparatus of claim S291, wherein the apparatus excludes suspected poisoned sources from transition function parameterization and increases uncertainty for predicted impact metrics.
S293. The apparatus of claim S291, wherein the apparatus records poisoning risk scores per source and includes the scores in a replay manifest in redacted form.
S294. The apparatus of claim S291, wherein the apparatus validates robustness by comparing simulation outputs across multiple feature sets and flags unstable outputs.
S295. The apparatus of claim S294, wherein the apparatus excludes external publishing actions from ranking for unstable outputs and outputs monitoring-only actions.
S296. The apparatus of claim S291, wherein the apparatus detects coordinated poisoning attempts using coordination indicators and synchronized posting windows and increases predicted adversarial response likelihood.
S297. The apparatus of claim S291, wherein the apparatus requires human approval to re-include quarantined sources and records approval events in an audit log.
S298. The apparatus of claim S291, wherein the apparatus performs backtesting across historical snapshots to measure sensitivity of ranked outputs to removal of suspected poisoned sources.
S299. The apparatus of claim S291, wherein the apparatus denies outputting external publishing actions when poisoning risk exceeds a threshold for sources referenced by a lineage manifest.
S300. The apparatus of claim S291, wherein the apparatus outputs a poisoning explanation artifact identifying contributing anomaly features, excluding never-log fields.

## Block 2 / Cluster 4: Cross-model consensus + disagreement handling (S301–S310)

S301. The apparatus of claim S1, wherein the apparatus obtains independent assessments from a plurality of models for at least one of manipulation technique labels, integrity risks, or candidate defense actions.
S302. The apparatus of claim S301, wherein the apparatus computes a disagreement score representing variance among the independent assessments.
S303. The apparatus of claim S302, wherein the apparatus increases uncertainty for predicted impact metrics when the disagreement score exceeds a threshold.
S304. The apparatus of claim S302, wherein the apparatus excludes external publishing actions from ranking when the disagreement score exceeds a threshold absent approval.
S305. The apparatus of claim S301, wherein the apparatus selects a consensus label using weighted voting with weights calibrated using historical accuracy metrics.
S306. The apparatus of claim S301, wherein the replay manifest includes model identifiers and model version identifiers contributing to consensus labels.
S307. The apparatus of claim S301, wherein the apparatus routes high-disagreement cases to adversarial scenario simulation prior to ranking.
S308. The apparatus of claim S301, wherein the apparatus generates a consensus explanation artifact describing agreements and disagreements among assessments, excluding never-log fields.
S309. The apparatus of claim S301, wherein the policy engine applies stricter constraints to actions generated under high disagreement scores.
S310. The apparatus of claim S301, wherein the apparatus recalibrates model weights when observed outcomes deviate from predicted impact metrics beyond a threshold.

## Block 2 / Cluster 5: Semantic canarying + harm-minimization constraints (S311–S320)

S311. The apparatus of claim S1, wherein the apparatus performs a semantic safety check on candidate defense actions using a harm-minimization constraint set stored in governance policies.
S312. The apparatus of claim S311, wherein the semantic safety check evaluates at least one of defamation risk, impersonation risk, or protected-class targeting risk.
S313. The apparatus of claim S311, wherein the policy engine denies outputting external publishing actions when the semantic safety check fails.
S314. The apparatus of claim S311, wherein the policy engine modifies a candidate defense action by removing or rewriting content segments associated with failed semantic constraints and the apparatus re-simulates modified actions.
S315. The apparatus of claim S1, wherein the apparatus outputs a canary recommendation specifying a constrained variant and rollback thresholds based on predicted trust impact.
S316. The apparatus of claim S315, wherein the apparatus outputs an automatic rollback recommendation when predicted trust impact exceeds a threshold during the canary.
S317. The apparatus of claim S311, wherein the replay manifest includes semantic safety check outputs and identifiers of failed constraints as redacted artifacts.
S318. The apparatus of claim S311, wherein the apparatus restricts candidate defense actions to template-based messaging when semantic safety check confidence is below a threshold.
S319. The apparatus of claim S311, wherein the apparatus computes a harm-minimization score and uses the score as a constraint in ranking.
S320. The apparatus of claim S311, wherein the apparatus requires approval to override a failed semantic safety check and records the override in an audit log.

## Block 2 / Cluster 6: Disaster recovery + continuity-of-operations (S321–S330)

S321. The apparatus of claim S1, wherein the apparatus maintains immutable backups of audit logs, policy bundles, and replay manifests with periodic snapshot hashes.
S322. The apparatus of claim S321, wherein the apparatus generates a recovery proof artifact indicating that restored artifacts match stored snapshot hashes.
S323. The apparatus of claim S321, wherein the apparatus enters a continuity safe mode that excludes external publishing actions from ranking when an audit log store is unavailable.
S324. The apparatus of claim S323, wherein the apparatus outputs monitoring-only actions while in the continuity safe mode.
S325. The apparatus of claim S321, wherein the apparatus maintains geographically separated replicas of policy bundles and selects a replica using an attested policy bundle hash.
S326. The apparatus of claim S321, wherein the apparatus records failover events and selected replica identifiers in an append-only audit log.
S327. The apparatus of claim S321, wherein the apparatus performs periodic integrity checks on backups and records results as proof artifacts.
S328. The apparatus of claim S321, wherein the apparatus requires a recovery approval token to resume outputting external publishing actions after failover.
S329. The apparatus of claim S321, wherein the apparatus preserves determinism by maintaining consistent replay manifests and fixed-seed settings across failover events.
S330. The apparatus of claim S321, wherein the apparatus denies producing output permitted defense actions when a recovery proof artifact is missing for a reporting period.
