# Prompt 10: Risk & Incident Tracker with Policy Drift Monitoring

**Tier:** 2 - Application Features
**Priority:** Medium
**Effort:** 1 week
**Dependencies:** Prompts 1, 4, 7
**Blocks:** Prompts 6, 8
**Parallelizable:** Yes (with Prompt 11)

---

You are Claude Code, an AI software engineer for Topicality.

Context:
- We have a "Risk & Compliance" cadence:
  - track incidents,
  - monitor policy drift,
  - report on attestations.
- We want a minimal risk/incident tracker backend that can later connect to dashboards.

Goal:
Implement a small service or module to:
- record incidents,
- record policy violations,
- summarize risk posture over a time window.

Assumptions:
- Use the same backend stack as other services (TypeScript/Node or Python + Postgres or SQLite).
- Focus on API + data model; UI is not required.

Requirements:
1. Data model
   - Incident: id, title, description, severity, category (security/legal/delivery/other), status, created_at, resolved_at, owner, linked_run_id, linked_entity_ids.
   - Policy violation: id, policy_name, severity, resource_type, resource_id, subject_id, timestamp, remediation_status.
   - Attestation: id, type (sbom, slsa, dpa/dpia, osv, trivy), artifact_id, run_id, status, created_at.

2. API
   - Create & update incidents.
   - List incidents with filters (status, severity, date range).
   - Record policy violations.
   - List policy violations by policy_name and time range.
   - Fetch a "weekly risk summary" with counts by severity & category.

3. Integration stubs
   - Example of how a service could call this when:
     - a policy check fails,
     - a release gate fails.

4. Tests & docs
   - Unit tests for core operations.
   - README explaining:
     - how to use the API,
     - example weekly summary output.

Deliverables:
- Data model & migrations.
- Service/API code.
- Example usage scripts.
- Tests and README.
