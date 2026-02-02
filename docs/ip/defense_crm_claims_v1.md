Owner: IP-Legal
Last-Reviewed: 2025-01-20
Evidence-IDs: none
Status: active

# Patent Claims: Defense Communication Response Management (CRM)

## 1. Terminology

- **Connector capability grant**: A cryptographic or policy-based authorization record defining the permitted operations (e.g., channels, audiences, content types, rate limits, time windows) an execution connector is allowed to perform on behalf of the system.
- **SBOM record**: A software bill of materials record for a connector or system component, documenting all software dependencies, versions, and attestations.
- **Policy template**: A baseline governance policy bundle that can be shared across multiple tenants and inherited by tenant-specific policies.
- **Tenant override**: A tenant-specific policy modification or addition that augments or restricts a shared governance policy template.
- **Alert storm**: A condition where the rate of risk-triggered events or alerts exceeds a defined threshold within a rolling time window, potentially causing human operator fatigue.
- **Queue health metric**: Quantitative measures of a human review workflow's state, such as backlog size, average review time, or approval throughput.
- **Fairness constraint**: A governance rule intended to ensure equitable distribution of workload among operators or to enforce separation of duties (e.g., prohibiting a same operator from proposing and approving a same action).

## 2. Specification Support

### 2.1 SBOM/Attestation at Connector Boundary

The system enforces a mandatory governance "chokepoint" at the connector boundary. Execution of any external publishing defense action requires that the associated connector possesses a valid, attested SBOM record and a corresponding connector capability grant. If the SBOM hash or attestation is missing, or if a dependency delta is detected between the current and prior SBOM records without explicit approval, the system denies the action or enters a safe mode to prevent unverified code execution.

### 2.2 Template Inheritance and Harmonization

In multi-tenant configurations, governance policies are managed through a template inheritance model. A global governance policy template provides a baseline of hardened constraints. Individual tenants may define override policy bundles, but these are subjected to a harmonization check to ensure that core safety invariants (such as deny-by-default for external publishing) are preserved. The effective policy is represented by a deterministic policy bundle hash, which is recorded in the audit log for every decision.

### 2.3 Overload-Safe Modes with Audit Artifacts

To maintain operational safety under high load or during an alert storm, the system monitors queue health metrics and alert rates. When these metrics degrade beyond safety thresholds, the system enters an overload safe mode. In this mode, defense actions are restricted to monitoring-only or are heavily throttled to prevent review fatigue and accidental approvals of risky actions. Every transition to an overload state generates a signed overload artifact stored in the append-only audit log.

## 3. Dependent Claims (C241–C270)

C241. The medium of claim C1, wherein the instructions cause the system to execute external publishing defense actions only through execution connectors that each have an associated connector capability grant defining permitted operations.
C242. The medium of claim C241, wherein the connector capability grant specifies at least one of permitted channels, permitted audiences, permitted content types, permitted rate limits, or permitted time windows.
C243. The medium of claim C1, wherein the instructions cause the system to associate each execution connector with a software bill of materials (SBOM) record comprising dependency identifiers and dependency versions.
C244. The medium of claim C243, wherein the instructions cause the system to compute a connector SBOM hash and store the connector SBOM hash in the audit log linked to executed defense actions.
C245. The medium of claim C243, wherein the instructions cause the system to deny execution of an external publishing defense action when an SBOM record or connector SBOM hash is missing or not attested.
C246. The medium of claim C1, wherein the instructions cause the system to detect a dependency delta between a current SBOM record and a prior SBOM record and to require human approval prior to enabling the dependency delta for production execution.
C247. The medium of claim C246, wherein the instructions cause the system to enter a safe mode that denies external publishing defense actions when a dependency delta is present and unapproved.
C248. The medium of claim C1, wherein the instructions cause the system to require that each executed defense action references a connector identifier and a connector capability grant version identifier.
C249. The medium of claim C1, wherein the instructions cause the system to maintain per-connector secrets in a secret manager and to restrict access to the secrets to a protected execution environment.
C250. The medium of claim C1, wherein the instructions cause the system to record failed connector authorization attempts and associated denial reasons in the audit log.
C251. The medium of claim C1, wherein the instructions cause the system to operate in a multi-tenant configuration and to apply a governance policy template shared across a plurality of tenants.
C252. The medium of claim C251, wherein each tenant maintains a tenant override policy bundle that augments or restricts the governance policy template.
C253. The medium of claim C252, wherein the instructions cause the system to compute an effective policy bundle hash for a tenant by deterministically combining the governance policy template and the tenant override policy bundle.
C254. The medium of claim C253, wherein the effective policy bundle hash is stored in the audit log for each policy decision and for each executed defense action.
C255. The medium of claim C252, wherein the instructions cause the system to deny external publishing defense actions when a tenant override conflicts with the governance policy template and a conflict resolution rule is not satisfied.
C256. The medium of claim C1, wherein the instructions cause the system to perform a harmonization check that verifies required deny-by-default constraints are preserved under tenant overrides.
C257. The medium of claim C256, wherein the system enters conflict-safe mode for a tenant when the harmonization check fails and restricts outputs to monitoring-only actions for the tenant.
C258. The medium of claim C252, wherein the instructions cause the system to generate a tenant policy diff report describing differences between the governance policy template and the tenant override policy bundle.
C259. The medium of claim C258, wherein the tenant policy diff report is stored as a redacted artifact excluding never-log fields and linked to a policy bundle hash.
C260. The medium of claim C1, wherein the instructions cause the system to restrict federation or cross-tenant recommendations to those permitted by each tenant’s effective policy bundle hash.
C261. The medium of claim C1, wherein the instructions cause the system to compute queue health metrics for human review workflows comprising at least one of backlog size, average review time, or approval throughput.
C262. The medium of claim C261, wherein the system restricts external publishing defense actions to monitoring-only when queue health metrics degrade beyond a threshold.
C263. The medium of claim C1, wherein the instructions cause the system to detect an alert storm based on a rate of risk-triggered events exceeding a threshold within a rolling time window.
C264. The medium of claim C263, wherein the instructions cause the system to throttle generation of candidate external publishing defense actions during an alert storm and to prioritize monitoring-only actions.
C265. The medium of claim C1, wherein the instructions cause the system to enforce fairness constraints that limit a fraction of review tasks assigned to a single operator within a rolling time window.
C266. The medium of claim C265, wherein the fairness constraints enforce separation of duties by prohibiting assignment of both proposal and approval tasks for a same defense action to a same operator.
C267. The medium of claim C1, wherein the instructions cause the system to maintain an alert fatigue score per operator derived from review load cap usage and alert storm frequency.
C268. The medium of claim C267, wherein the system requires a second approver when an alert fatigue score exceeds a threshold.
C269. The medium of claim C1, wherein the instructions cause the system to generate an overload artifact indicating which overload trigger caused throttling and to store the overload artifact in the audit log linked to a snapshot hash.
C270. The medium of claim C1, wherein the instructions cause the system to require explicit approval to exit an overload safe mode and to record the approval in the audit log.

## 4. CI Verifier Spec Additions

- **Connector SBOM gate**: Deny external publish unless connector SBOM record + capability grant + attestation are present.
- **Governance harmonization tests**: Verify that template + tenant override resolution is deterministic and that conflicts trigger safe mode.
- **Fairness/overload tests**: Verify that alert storms or review overload triggers throttling and monitoring-only fallback, and that overload artifacts are logged.
