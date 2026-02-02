# Patent Claims: Defensive CRM Expansion (v1)

## Independent Claims

### Claim C1
A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause the processors to perform operations for governing a defensive narrative architecture, the operations comprising:
1.  maintaining a narrative operating graph comprising a plurality of nodes representing narrative states and a plurality of edges representing causal dependencies between the nodes;
2.  executing a continuous compliance monitor to evaluate executed and scheduled defense actions against a set of governance policies to detect a compliance drift event;
3.  computing an authenticity signal for an artifact referenced by a candidate defense action, the authenticity signal comprising at least one of a watermark status, a provenance chain completeness status, or an authenticity confidence score;
4.  enforcing a structured approval workflow requiring completion of a human review checklist prior to executing an external publishing defense action; and
5.  recording compliance drift events, authenticity signals, and checklist completion artifacts in an append-only audit log linked to a cryptographic hash of the narrative operating graph.

## Dependent Claims (C211–C240)

### Cluster 1: Continuous compliance monitoring + drift detection (C211–C220)

C211. The medium of claim C1, wherein the instructions cause the system to execute a continuous compliance monitor that evaluates executed and scheduled defense actions against governance policies after policy decisions are issued.
C212. The medium of claim C211, wherein the continuous compliance monitor detects a compliance drift event when a defense action permitted under a first policy bundle hash would be denied under a second policy bundle hash.
C213. The medium of claim C212, wherein the instructions cause the system to record the compliance drift event in an audit log together with identifiers of the first policy bundle hash, the second policy bundle hash, and affected defense action types.
C214. The medium of claim C211, wherein the continuous compliance monitor validates that each executed defense action includes required structured fields comprising attribution fields and uncertainty fields.
C215. The medium of claim C211, wherein the continuous compliance monitor enforces a safe mode that denies external publishing defense actions while a compliance drift event remains unresolved.
C216. The medium of claim C215, wherein the instructions cause the system to restrict outputs to monitoring-only actions while in the safe mode.
C217. The medium of claim C211, wherein the continuous compliance monitor generates a compliance proof artifact indicating pass or fail for a set of compliance assertions applied to an executed defense action.
C218. The medium of claim C217, wherein the compliance proof artifact is linked to a graph snapshot hash and stored in the audit log.
C219. The medium of claim C211, wherein the continuous compliance monitor detects policy misconfiguration by identifying a defense action that is simultaneously allowed and denied by different applicable rules and triggers conflict-safe mode.
C220. The medium of claim C211, wherein the instructions cause the system to deny execution when a compliance proof artifact is missing for a defense action requiring external publishing.

### Cluster 2: Authenticity / watermark / provenance deepening (C221–C230)

C221. The medium of claim C1, wherein the instructions cause the system to compute an authenticity signal for an artifact referenced by a candidate defense action, the authenticity signal comprising at least one of a watermark status, a provenance chain completeness status, or an authenticity confidence score.
C222. The medium of claim C221, wherein the watermark status is selected from present, absent, invalid, or unknown.
C223. The medium of claim C221, wherein the instructions cause the system to require that external publishing defense actions referencing media artifacts include an authenticity confidence score exceeding a threshold.
C224. The medium of claim C221, wherein the policy engine denies external publishing defense actions when watermark status is invalid or provenance chain completeness is below a threshold.
C225. The medium of claim C221, wherein the instructions cause the system to store authenticity signals as nodes linked to artifacts in the narrative operating graph.
C226. The medium of claim C221, wherein the instructions cause the system to record, in the audit log, an authenticity evaluation explanation describing checks performed and checks not performed.
C227. The medium of claim C221, wherein the instructions cause the system to prefer monitoring-only defense actions when authenticity confidence is unknown.
C228. The medium of claim C221, wherein the instructions cause the system to update risk indicators for narrative states based on authenticity signals associated with referenced artifacts.
C229. The medium of claim C221, wherein the instructions cause the system to generate an authenticity remediation recommendation comprising requesting additional provenance metadata or substituting a safer playbook variant.
C230. The medium of claim C221, wherein the instructions cause the system to bind authenticity signals to a lineage manifest and store a lineage hash reflecting the authenticity signals.

### Cluster 3: Human accountability / UX safety invariants (C231–C240)

C231. The medium of claim C1, wherein the instructions cause the system to require completion of a human review checklist prior to executing any external publishing defense action.
C232. The medium of claim C231, wherein the checklist includes confirmations that required attribution fields and uncertainty fields are present and that integrity verification outputs are recorded.
C233. The medium of claim C231, wherein the instructions cause the system to generate a checklist completion artifact and store the artifact in the audit log linked to an approval token identifier.
C234. The medium of claim C1, wherein the instructions cause the system to enforce a review load cap that limits a number of external publishing approvals a given operator may approve within a rolling time window.
C235. The medium of claim C234, wherein the system restricts defense actions to monitoring-only when the review load cap is reached.
C236. The medium of claim C1, wherein the instructions cause the system to maintain operator accountability metrics comprising at least one of override frequency, denial reversal rate, or time-to-review, and to store aggregated accountability metrics in the audit log.
C237. The medium of claim C1, wherein the instructions cause the system to require a second approver for external publishing defense actions exceeding a risk threshold.
C238. The medium of claim C1, wherein the instructions cause the system to present a structured rationale summary to a human operator, the rationale summary comprising policy decision explanation, authenticity signals, and predicted impact metrics, prior to approval.
C239. The medium of claim C1, wherein the instructions cause the system to deny external publishing defense actions when a required checklist step is missing or incomplete and to record a denial reason in the audit log.
C240. The medium of claim C1, wherein the instructions cause the system to record post-execution operator review notes as a structured field excluding never-log fields and link the notes to outcomes in the narrative operating graph.

---

## Enablement and Specification Support

### Continuous Compliance Monitoring
The continuous compliance monitor operates as a runtime gate that evaluates defense actions post-decision but pre-execution. By comparing action intent against active policy bundle hashes, the system detects "compliance drift"—situations where a previously permitted action would now be denied due to policy updates or environmental changes. When drift is detected, the system triggers a fail-closed "safe mode," restricting outputs to monitoring-only actions to prevent unauthorized external publication.

### Authenticity and Provenance Verification
The authenticity verification stage integrates watermark detection and provenance chain analysis into the core governance loop. Artifacts (such as media or claims) are assigned an authenticity confidence score based on the presence of valid watermarks and the completeness of their cryptographic lineage. High-confidence artifacts are permitted for external defense actions, while artifacts with invalid or insufficient authenticity signals are relegated to internal monitoring or trigger remediation recommendations, such as requesting additional metadata.

### Human Accountability and Workflow Invariants
To ensure human-in-the-loop safety, the system enforces operational invariants through structured checklists and review load caps. Approval workflows require explicit confirmation of attribution and uncertainty fields, recorded as checklist completion artifacts linked to approval tokens. Review load caps prevent operator fatigue and maintain review quality by limiting the number of high-risk approvals per operator within a rolling window, automatically falling back to monitoring-only recommendations when caps are exceeded.
