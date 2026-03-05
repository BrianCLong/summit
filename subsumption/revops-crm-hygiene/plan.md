# MASTER PLAN: RevOps CRM Hygiene Subsumption

## Objective
Establish RevOps CRM Hygiene as the foundational Studio v1 vertical. Prioritize read-only detection across the CRM with write actions strictly scoped to sandbox/proposed change objects. This mitigates early risk while demonstrating immediate, provable value for RevOps teams.

## Guardrails
- **Read-All, Write-Safe:** Unrestricted read access to CRM data; write actions permitted ONLY to sandbox environments or dedicated "proposed changes" custom objects.
- **Target Audience:** RevOps Leads seeking pipeline cleanliness and standardized stages with minimal production risk.
- **No Direct Production Writes:** Zero direct modification of production CRM records in this phase.

## Golden Path Workflow
1. **Connect:** User authorizes CRM integration (e.g., Salesforce/HubSpot).
2. **Select Template:** User selects the "Clean my pipeline" workflow template in Studio.
3. **Detect:** Detection engine scans and flags hygiene issues (stale opps, missing data, inconsistent stages, dupes).
4. **Review & Approve:** User reviews human-readable proposals detailing what to change and why (diff view).
5. **Apply:** Approved changes are written directly to the sandbox CRM (or proposed change object).

## Technical Implementation
### Abstraction Layer
We will build a thin **CRM Abstraction Layer** rather than hardcoding to Salesforce.
*Why?* It prevents vendor lock-in, accelerates subsequent HubSpot/Dynamics integrations, and enforces a standard internal schema for hygiene detection. It is slightly more upfront cost but drastically reduces technical debt for v1.1.

### Detection Engine
Implement detectors for:
- Missing required fields
- Stale opportunities (no activity > X days)
- Inconsistent stage progression
- Duplicate contacts/accounts
- Unassigned owners

### UX/UI Copy
Use plain, domain-specific language:
- "Fix stale deals"
- "Complete missing data"
- "Make stages consistent"
- "Dedupe contacts"
*(Avoid "agent orchestration" or "evaluation framework" in the UI).*

## Measurement & Success Criteria
- **Metrics Tracked per Tenant:** Issues detected, proposed fixes generated, acceptance rate (accepted/edited/rejected), estimated hours saved.
- **Success Threshold:** ≥70% of pilot RevOps users connect their CRM and approve at least one bulk hygiene fix in week 1.
- **Zero-Incident Policy:** 0 production write incidents.
