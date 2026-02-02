# Patent Claims: Defensive Simulation Apparatus Expansion (v1)

## Independent Claims

### Claim S1
A simulation apparatus for governing a defensive narrative architecture, the apparatus comprising:
1.  a memory storing a set of governance policies and a narrative operating graph comprising a plurality of nodes and edges;
2.  one or more processors configured to:
    a) generate a plurality of candidate defense actions and a ranking of said candidate defense actions;
    b) execute a continuous compliance monitor to evaluate said candidate defense actions against the set of governance policies and detect a compliance drift event;
    c) compute an authenticity signal for an artifact referenced by at least one of said candidate defense actions;
    d) enforce a human-in-the-loop review invariant requiring completion of a structured checklist prior to forwarding an external publishing action to an execution interface; and
    e) record evaluation outcomes, authenticity signals, and checklist completion artifacts in a replayable audit log linked to a replay manifest identifier.

## Dependent Claims (S211–S240)

### Cluster 1: Continuous compliance monitoring + drift detection for ranking (S211–S220)

S211. The apparatus of claim S1, wherein the apparatus executes a continuous compliance monitor that evaluates ranked outputs and permitted defense action outputs against governance policies after ranking is produced.
S212. The apparatus of claim S211, wherein the apparatus detects a compliance drift event when a defense action permitted under a first policy bundle hash would be denied under a second policy bundle hash.
S213. The apparatus of claim S212, wherein the apparatus records the compliance drift event in an audit log together with identifiers of the first policy bundle hash, the second policy bundle hash, and affected defense action types.
S214. The apparatus of claim S211, wherein the compliance monitor validates that each output permitted defense action includes required attribution fields and uncertainty fields.
S215. The apparatus of claim S211, wherein the compliance monitor triggers a safe mode that excludes external publishing actions from ranking while a compliance drift event remains unresolved.
S216. The apparatus of claim S215, wherein the apparatus outputs monitoring-only actions while in the safe mode.
S217. The apparatus of claim S211, wherein the apparatus generates a compliance proof artifact indicating pass or fail for compliance assertions applied to an output permitted defense action.
S218. The apparatus of claim S217, wherein the compliance proof artifact is linked to a replay manifest identifier and recorded in an append-only audit log.
S219. The apparatus of claim S211, wherein the apparatus detects policy misconfiguration by identifying conflicting rule outcomes for a same structured defense action object and triggers conflict-safe mode.
S220. The apparatus of claim S211, wherein the apparatus denies producing an output permitted defense action when a required compliance proof artifact is missing.

### Cluster 2: Authenticity / watermark / provenance deepening in simulation (S221–S230)

S221. The apparatus of claim S1, wherein the apparatus computes an authenticity signal for an artifact referenced by a candidate defense action, the authenticity signal comprising at least one of watermark status, provenance chain completeness, or authenticity confidence score.
S222. The apparatus of claim S221, wherein the watermark status is selected from present, absent, invalid, or unknown.
S223. The apparatus of claim S221, wherein the apparatus conditions predicted trust impact and predicted legal risk on the authenticity confidence score.
S224. The apparatus of claim S1, wherein the policy engine denies outputting external publishing actions when watermark status is invalid or provenance chain completeness is below a threshold.
S225. The apparatus of claim S221, wherein the replay manifest includes authenticity signal identifiers and an authenticity evaluation explanation identifier.
S226. The apparatus of claim S221, wherein the apparatus increases uncertainty scores for predicted impact metrics when authenticity confidence is unknown.
S227. The apparatus of claim S221, wherein the apparatus ranks monitoring-only actions above publishing actions when authenticity confidence is below a threshold absent an approval token.
S228. The apparatus of claim S221, wherein the apparatus outputs an authenticity remediation recommendation comprising requesting additional provenance metadata or substituting a safer playbook variant.
S229. The apparatus of claim S221, wherein the apparatus stores authenticity signals as nodes linked to artifacts in the narrative operating graph.
S230. The apparatus of claim S221, wherein the apparatus binds authenticity signals to lineage manifests and includes a lineage hash reflecting authenticity signals in the replay manifest.

### Cluster 3: Human accountability / UX safety constraints in ranking (S231–S240)

S231. The apparatus of claim S1, wherein the apparatus outputs a recommendation requiring completion of a human review checklist prior to forwarding any external publishing action to an execution interface.
S232. The apparatus of claim S231, wherein the checklist includes confirmations that required attribution fields and uncertainty fields are present and that integrity verification outputs are recorded.
S233. The apparatus of claim S231, wherein the apparatus generates a checklist completion artifact and records the artifact in an audit log linked to an approval token identifier.
S234. The apparatus of claim S1, wherein the apparatus enforces a review load cap limiting a number of external publishing actions recommended for approval within a rolling time window.
S235. The apparatus of claim S234, wherein the apparatus outputs monitoring-only actions when the review load cap is reached.
S236. The apparatus of claim S1, wherein the apparatus computes operator accountability metrics from approval and override events and stores aggregated accountability metrics in an audit log.
S237. The apparatus of claim S1, wherein the apparatus requires a second approver for external publishing actions exceeding a risk threshold and records a dual-approval requirement in a replay manifest.
S238. The apparatus of claim S1, wherein the apparatus outputs a structured rationale summary comprising policy explanations, authenticity signals, and predicted impact metrics for presentation to a human operator prior to approval.
S239. The apparatus of claim S1, wherein the apparatus denies forwarding an external publishing action when a required checklist step is missing and records a denial reason.
S240. The apparatus of claim S1, wherein the apparatus records post-execution operator review notes as structured fields excluding never-log fields and links the notes to calibration updates when permitted by governance policies.

---

## Enablement and Specification Support

### Continuous Compliance Monitoring
The continuous compliance monitor operates as a runtime gate that evaluates defense actions post-decision but pre-execution. By comparing action intent against active policy bundle hashes, the system detects "compliance drift"—situations where a previously permitted action would now be denied due to policy updates or environmental changes. When drift is detected, the system triggers a fail-closed "safe mode," restricting outputs to monitoring-only actions to prevent unauthorized external publication.

### Authenticity and Provenance Verification
The authenticity verification stage integrates watermark detection and provenance chain analysis into the core governance loop. Artifacts (such as media or claims) are assigned an authenticity confidence score based on the presence of valid watermarks and the completeness of their cryptographic lineage. High-confidence artifacts are permitted for external defense actions, while artifacts with invalid or insufficient authenticity signals are relegated to internal monitoring or trigger remediation recommendations, such as requesting additional metadata.

### Human Accountability and Workflow Invariants
To ensure human-in-the-loop safety, the system enforces operational invariants through structured checklists and review load caps. Approval workflows require explicit confirmation of attribution and uncertainty fields, recorded as checklist completion artifacts linked to approval tokens. Review load caps prevent operator fatigue and maintain review quality by limiting the number of high-risk approvals per operator within a rolling window, automatically falling back to monitoring-only recommendations when caps are exceeded.
