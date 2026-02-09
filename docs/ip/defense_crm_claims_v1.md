# Defense CRM Claims — v1

<!--
DEPENDENCY NOTE:
Claims in this file (C271–C330) are part of the "next and more" ITEM normalization block.
They assume that claims C1–C270 exist as dependencies in parallel development branches
(e.g., feat/ip-expansion-*) that have not yet been merged to main.
-->

## A) MASTER PLAN

### 1.0 ITEM normalization
* **ITEM:** “next and more” = continue with **two consecutive +30 blocks** per family (i.e., **+60 new dependents per family**) to accelerate growth.
* **Output:** C271–C330 (60 claims)

### 1.1 Drafting goals
Add six continuation-ready moat clusters (three per +30 block), all defense/governance oriented:
**Block 1 (C271–C300):**
1) **Policy rule provenance + per-rule explainability**
2) **Credentialed approvals + delegation + revocation**
3) **Adversarial data poisoning defenses** (input integrity, robustness checks)

**Block 2 (C301–C330):**
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
Create an independent claim on policy rule provenance, explainability, and rule-level audits, with 25 dependents drawn from C271–C280.

### B) Credentialed approvals continuation pack
Create an independent claim on approval credentials, delegation, revocation, and step-up authentication, with 25 dependents from C281–C290.

### C) Poisoning defenses continuation pack
Create an independent claim on poisoning detection, source reliability drift, quarantine, and robustness checks, with 25 dependents from C291–C300.

### D) Cross-model consensus + semantic canarying continuation pack
Create an independent claim on model disagreement handling + semantic canary constraints + safe fallbacks, with 25 dependents from C301–C320.

### E) DR/COOP continuation pack
Create an independent claim on immutable audit backups + recovery proofs + continuity safe modes, with 25 dependents from C321–C330.

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

# ADDITIONAL DEPENDENT CLAIMS — CRM (C271–C330)

## Block 1 / Cluster 1: Policy rule provenance + per-rule explainability (C271–C280)

C271. The medium of claim C1, wherein the instructions cause the system to store, for each governance rule, rule provenance metadata comprising at least one of author identifier, approval identifier, effective date, or jurisdiction scope.
C272. The medium of claim C271, wherein the policy decision includes identifiers of each governance rule evaluated and an outcome per rule indicating satisfied, violated, or not applicable.
C273. The medium of claim C271, wherein the instructions cause the system to generate a rule-level explanation artifact comprising a minimal subset of rules that determined an allow, deny, or modify decision.
C274. The medium of claim C273, wherein the rule-level explanation artifact is stored in the audit log linked to a policy bundle hash and a structured defense action object hash.
C275. The medium of claim C271, wherein the instructions cause the system to detect rule drift by comparing outcomes per rule across time for a same defense action type and record a drift indicator.
C276. The medium of claim C275, wherein the system enters a safe mode that denies external publishing when rule drift exceeds a threshold absent human review.
C277. The medium of claim C271, wherein the instructions cause the system to enforce that modify decisions include a rule-to-edit mapping indicating which rule each modification satisfies.
C278. The medium of claim C271, wherein the instructions cause the system to generate a policy trace artifact comprising an ordered list of rule evaluations and intermediate constraint values.
C279. The medium of claim C278, wherein the policy trace artifact excludes never-log fields and is stored as a redacted artifact linked to snapshot hash.
C280. The medium of claim C271, wherein the instructions cause the system to require human approval to activate governance rules lacking rule provenance metadata.

## Block 1 / Cluster 2: Credentialed approvals + delegation + revocation (C281–C290)

C281. The medium of claim C1, wherein the instructions cause the system to require that approval tokens are cryptographically signed by an approver credential associated with a human operator.
C282. The medium of claim C281, wherein the instructions cause the system to verify an approval token signature prior to executing an external publishing defense action.
C283. The medium of claim C281, wherein the instructions cause the system to support delegated approvals by issuing a delegation credential with a bounded scope comprising at least one of permitted channels, time windows, or risk thresholds.
C284. The medium of claim C283, wherein the system denies execution when an approval token exceeds the bounded scope of the delegation credential.
C285. The medium of claim C281, wherein the instructions cause the system to maintain a revocation list for approver credentials and to deny execution when a signing credential is revoked.
C286. The medium of claim C1, wherein the instructions cause the system to require step-up authentication for approvals of defense actions exceeding a risk threshold.
C287. The medium of claim C286, wherein the system records a step-up authentication artifact in the audit log linked to the approval token identifier.
C288. The medium of claim C1, wherein the instructions cause the system to enforce dual-control approvals requiring two independent signed approval tokens for external publishing defense actions above a risk threshold.
C289. The medium of claim C288, wherein the system denies execution when the two independent signed approval tokens are generated by a same credential or a same delegated scope.
C290. The medium of claim C1, wherein the instructions cause the system to record credential identifiers, delegation scope identifiers, and revocation status in the audit log for each executed defense action.

## Block 1 / Cluster 3: Adversarial data poisoning defenses (C291–C300)

C291. The medium of claim C1, wherein the instructions cause the system to detect potential data poisoning by identifying anomalous shifts in source reliability scores or embedding distributions for ingested content.
C292. The medium of claim C291, wherein the system quarantines suspected poisoned content by excluding the content from narrative state construction and from candidate defense action generation.
C293. The medium of claim C292, wherein the system records quarantine events in the audit log linked to source identifiers and transformation identifiers.
C294. The medium of claim C291, wherein the system computes a poisoning risk score per source and reduces weights of sources having poisoning risk scores above a threshold.
C295. The medium of claim C291, wherein the system validates narrative state clusters using a robustness check that compares clustering outcomes across multiple feature sets and flags unstable clusters.
C296. The medium of claim C295, wherein the system restricts defense actions to monitoring-only for narrative states associated with unstable clusters.
C297. The medium of claim C291, wherein the system detects coordinated poisoning attempts using coordination indicators and synchronized posting windows.
C298. The medium of claim C291, wherein the system requires human review of quarantine releases and records release approvals in the audit log.
C299. The medium of claim C291, wherein the system executes a backtesting procedure on historical snapshots to determine whether suspected poisoned sources would have altered prior policy decisions.
C300. The medium of claim C291, wherein the policy engine denies external publishing defense actions when poisoning risk exceeds a threshold for sources referenced by a lineage manifest.

## Block 2 / Cluster 4: Cross-model consensus + disagreement handling (C301–C310)

C301. The medium of claim C1, wherein the instructions cause the system to obtain, from a plurality of models, independent assessments of at least one of manipulation technique labels, integrity risks, or candidate defense actions.
C302. The medium of claim C301, wherein the system computes a disagreement score representing variance among the independent assessments.
C303. The medium of claim C302, wherein the system increases uncertainty fields in candidate defense actions when the disagreement score exceeds a threshold.
C304. The medium of claim C302, wherein the system restricts external publishing defense actions to monitoring-only when the disagreement score exceeds a threshold absent human approval.
C305. The medium of claim C301, wherein the system selects a consensus label using a weighted voting mechanism in which weights are calibrated using historical accuracy metrics stored in evidence artifacts.
C306. The medium of claim C301, wherein the system records model identifiers and model version identifiers contributing to the consensus label in the audit log.
C307. The medium of claim C301, wherein the system routes high-disagreement cases to a red-team evaluation path prior to generating publishable defense actions.
C308. The medium of claim C301, wherein the system generates a consensus explanation artifact describing which assessments agreed and which disagreed, excluding never-log fields.
C309. The medium of claim C301, wherein the policy engine applies stricter constraints to defense actions generated under high disagreement scores.
C310. The medium of claim C301, wherein the system recalibrates model weights when observed outcomes deviate from predicted impact metrics beyond a threshold.

## Block 2 / Cluster 5: Semantic canarying + harm-minimization constraints (C311–C320)

C311. The medium of claim C1, wherein the instructions cause the system to perform a semantic safety check on a candidate defense action using a harm-minimization constraint set stored in governance policies.
C312. The medium of claim C311, wherein the semantic safety check evaluates at least one of defamation risk, impersonation risk, or protected-class targeting risk.
C313. The medium of claim C311, wherein the policy engine denies external publishing defense actions when the semantic safety check fails.
C314. The medium of claim C311, wherein the policy engine modifies a defense action by removing or rewriting content segments associated with a failed semantic constraint and records a modify rationale.
C315. The medium of claim C311, wherein the system canaries an external publishing defense action by first publishing a constrained variant and measuring trust impact before broader deployment.
C316. The medium of claim C315, wherein the system automatically rolls back the external publishing defense action when trust impact exceeds a threshold during the canary.
C317. The medium of claim C311, wherein the system records semantic safety check outputs and failed constraints as redacted artifacts linked to a policy bundle hash.
C318. The medium of claim C311, wherein the system restricts candidate defense actions to template-based messaging when semantic safety check confidence is below a threshold.
C319. The medium of claim C311, wherein the system computes a harm-minimization score and includes the score as a constraint in ranking candidate defense actions.
C320. The medium of claim C311, wherein the system requires human approval to override a failed semantic safety check and records the override in the audit log.

## Block 2 / Cluster 6: Disaster recovery + continuity-of-operations for governance/audit (C321–C330)

C321. The medium of claim C1, wherein the instructions cause the system to maintain immutable backups of audit logs and policy bundles with periodic snapshot hashes.
C322. The medium of claim C321, wherein the system generates a recovery proof artifact indicating that a restored audit log matches a stored snapshot hash.
C323. The medium of claim C321, wherein the system enters a continuity safe mode that denies external publishing defense actions when an audit log store is unavailable.
C324. The medium of claim C323, wherein the continuity safe mode restricts outputs to monitoring-only actions until audit availability is restored.
C325. The medium of claim C321, wherein the system maintains geographically separated replicas of policy bundles and uses an attested policy bundle hash to select a replica.
C326. The medium of claim C321, wherein the system records failover events and selected replica identifiers in the audit log.
C327. The medium of claim C321, wherein the system performs periodic integrity checks on backups and records results as proof artifacts.
C328. The medium of claim C321, wherein the system requires a recovery approval token to resume external publishing after disaster recovery failover.
C329. The medium of claim C321, wherein the system preserves replay manifests and verification proof artifacts across failover events.
C330. The medium of claim C321, wherein the system denies execution when a recovery proof artifact is missing for a reporting period.
