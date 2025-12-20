# Cross-Domain Security Model

## Objectives
- Provide unified access control for OSINT, Forensics, Cyber Defense, and Financial Intelligence (FinIntel) while isolating sensitive workflows.
- Combine role-based access control (RBAC) with attribute-based access control (ABAC) to enforce need-to-know, data-handling caveats, and environmental posture.
- Embed separation of duties (SoD) to prevent conflicting responsibilities across investigative, operational, and approval actions.
- Produce auditable evidence for regulatory, chain-of-custody, and threat-hunting requirements.
- Maintain data sovereignty and classification handling consistency across all domains via deterministic tagging and redaction.

## Core Roles by Vertical
| Vertical | Core Roles | Sample Permissions | SoD Pairing |
| --- | --- | --- | --- |
| OSINT | OSINT Collector, OSINT Analyst, OSINT Lead | Open-source collection, tagging, enrichment, publish sanitized intelligence | Collector ≠ Publisher; Analyst requires Lead approval to disseminate |
| Forensics | Forensic Triage, Forensic Analyst, Evidence Custodian | Device imaging, volatile data capture, evidence intake, timeline reconstruction | Triage ≠ Custodian; Custodian approves export/release |
| Cyber Defense | SOC Tier1, SOC Tier2, Incident Commander | Alert triage, containment actions, IR plan execution | Tier1 requests, Tier2 executes, Commander authorizes prod-impacting actions |
| FinIntel | FinIntel Investigator, FinIntel Analyst, Financial Compliance Officer | Transaction tracing, sanctions screening, SAR drafting and approval | Investigator/Analyst draft, Compliance approves SAR |

Role definitions include least-privilege task bundles and map to group memberships in IAM (e.g., `osint-analyst`, `forensics-custodian`, `soc-tier2`, `finintel-compliance`). Each group aligns to an OPA/Cedar policy set and a SCIM-synchronized IdP group.

## Attribute-Based Policy Model
- **Identity attributes:** clearance level, geo/tenant, vertical (`osint|forensics|cyber|finintel`), employment type, training status (e.g., KYC/SAR training).
- **Resource attributes:** data domain, classification, handling caveats (e.g., `law-enforcement-sensitive`, `pci`, `pifi`), chain-of-custody state, case ownership, evidence integrity state.
- **Environment attributes:** network zone (prod/lab), device posture (EDR healthy, disk encryption), MFA strength, time window, data residency.
- **Action attributes:** data acquisition vs. analysis vs. dissemination, destructive actions (quarantine, kill process), attestations (dual-control required).
- **Policy evaluation:** PDP (e.g., OPA, AWS Cedar, or XACML) executes ABAC rules; PEPs enforced at API gateways, workflow services, storage layers, and case management UI. PDP bundles include per-vertical default-deny baselines plus break-glass overlays with short TTLs.

### Example Policies (expressed as conditions)
- OSINT collectors may ingest public data **only if** device posture is healthy, data domain is `osint`, and classification ≤ `internal`.
- Forensic analysts can view evidence **only when** case ownership includes their team and chain-of-custody state is not `sealed`; exporting artifacts requires custodian approval, watermarking enabled, and immutable manifest recorded.
- SOC Tier2 can quarantine hosts **only if** incident severity ≥ `high`, action requested by Tier1 or automation playbook, and dual approval from Incident Commander for production systems.
- FinIntel investigators can access transaction details tagged `pci` or `pifi` **only if** clearance ≥ `confidential`, geo is permitted for data residency, and training for financial compliance is current.
- Cross-vertical sharing of intelligence requires resource tags to include `shareable` and redaction flag set; PEP strips non-shareable fields automatically.
- Approvals require context matching: same case ID, matching request/approval time window, and approver outside requester's reporting chain for SAR and evidence export.

#### Sample Rego (OPA) snippet (illustrative)
```rego
package authz.cross_domain

default allow = false

# Require role + domain alignment
allow {
  input.user.roles[_] == sprintf("%s-analyst", [input.resource.domain])
  input.resource.classification != "sealed"
  input.env.device_posture == "healthy"
  not requires_dual_control
}

requires_dual_control {
  input.action == "export"
  input.resource.domain == "forensics"
}
```

## Separation of Duties Controls
- **Collection vs. Analysis:** collectors (OSINT, Forensics) cannot publish or delete evidence; analysts require custodian or lead approval to disseminate or purge; publishers must attest to redaction profile applied.
- **Investigation vs. Remediation:** SOC Tier2 executes containment; Incident Commander authorizes production-impacting actions; post-incident review performed by separate QA/Compliance role.
- **Request vs. Approve:** access elevation, evidence export, and SAR submission require dual control—requester cannot approve their own action; FinIntel SAR approvals restricted to Compliance Officer role with regional compliance routing.
- **Case Ownership:** case creation assigns primary/secondary owners; policy blocks owners from certifying their own chain-of-custody attestations; automated reminders enforce attestation within SLA.
- **Break-glass:** emergency roles are isolated, logged, time-bound (≤2 hours), and require retrospective approval with auto-expiry and mandatory debrief artifact.

## Data Handling & Federation
- **Per-vertical data planes:** isolated storage buckets/workspaces per vertical with distinct encryption keys and audit scopes.
- **Tag propagation:** ingest pipelines apply domain-specific tags (`osint`, `forensics`, `cyber`, `finintel`) plus sensitivity labels; tags are immutable to preserve lineage and copied into audit entries.
- **Redaction/transform gateways:** cross-domain data flows traverse a transformation service that enforces downgrades (mask PII, tokenize PCI) and logs field-level redaction decisions; rejected downgrades are blocked and surfaced to compliance queue.
- **Case linking:** federated search exposes only metadata unless ABAC grants full access; sensitive attachments remain in origin domain unless sharing flag is set and SoD approvals are present.
- **Data residency & sovereignty:** PDP enforces `geo == resource.geo_allowed`; cross-border transfers require compliance officer approval and tokenized fields for PCI/PII.

## Audit & Observability
- **Events captured:** authN, authZ decisions (allow/deny with policy ID), data access (read/write/export), admin actions, SoD approval artifacts, chain-of-custody updates, redaction outcomes.
- **Retention & integrity:** append-only audit store with WORM/immutable backups; signed evidence manifests and hash-chained logs for forensic credibility; retention aligned to regulatory minima per vertical (e.g., SAR ≥5 years).
- **Traceability:** request IDs propagate through PEPs/PDPs and workflow engines; case IDs and evidence IDs included in every audit entry; dashboards highlight cross-domain data pulls and break-glass use.
- **Continuous monitoring:** anomaly detection on policy decision streams (e.g., surge in denied PCI access); periodic attestation of PDP policy bundles with checksum comparison; alert on policy drift between environments.
- **Audit read access:** restricted to compliance and leads; audit exports require dual approval and watermarking.

## Operational Workflow
1. Identity provider issues tokens containing roles + attributes; device posture service injects environment claims.
2. PEP (API gateway, case UI, storage proxy) forwards request context to PDP; PDP evaluates RBAC + ABAC rules and SoD constraints.
3. If approved, PEP enforces response shaping (field-level redaction, masked exports) and records audit events.
4. If denied or dual-control required, workflow service triggers approval tasks; audit trail captures requester, approver, policy IDs, and evidence hashes.
5. Observability pipeline forwards audit and policy decision logs to SIEM with domain tags for OSINT/Forensics/Cyber/FinIntel segmentation.
6. Metrics surface per-domain approval latency, SoD violations prevented, and break-glass usage for weekly governance review.

## Implementation Notes
- Represent policies as code (e.g., Rego/Cedar) with CI validation, drift detection, and versioned bundles per environment; enforce policy tests as a pre-merge gate.
- Align role names with IAM/IdP groups; configure SCIM to synchronize domain-specific groups and training status attributes.
- Enforce device posture and geo controls via conditional access; block access from non-compliant or unsanctioned regions by default.
- Provide self-service access requests with SoD-aware approval chains; auto-expire time-bound approvals to reduce standing privilege.
- Integrate audit trails with evidence management: every export includes manifest ID, hash, origin domain, redaction policy version, and approver identity.
- Periodically simulate insider/outsider abuse cases (e.g., mass export, cross-vertical exfil) to validate PDP/PEP and SoD controls; capture findings in corrective action plan.
