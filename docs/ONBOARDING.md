# Onboarding Guide

This guide covers both technical developer onboarding and HR/legal onboarding requirements.

## Part 1: Developer Onboarding Checklist

This checklist matches the command flow and endpoints published in the main README.

### Prerequisites (must-have)

- [ ] Docker Desktop installed (README calls out Docker Desktop ≥ 4.x).
- [ ] Node.js installed at **20.11.0** (README says it matches `.tool-versions`).
- [ ] `pnpm` installed (README calls out pnpm 9).
- [ ] Python 3.11+ installed (README calls out Python 3.11+).

### Golden Path: "running stack in minutes"

- [ ] Clone and enter repo:
  - `git clone https://github.com/BrianCLong/summit.git`
  - `cd summit`

- [ ] Bootstrap dev environment:
  - `make bootstrap`

- [ ] Start the Docker stack:
  - `make up`

- [ ] Validate baseline health:
  - `make smoke`

### Confirm you can reach required endpoints

Open these in a browser (from README):

- [ ] Frontend: `http://localhost:3000`
- [ ] GraphQL API: `http://localhost:4000/graphql`
- [ ] Neo4j Browser: `http://localhost:7474` (README lists `neo4j` / `devpassword`)
- [ ] Adminer: `http://localhost:8080`
- [ ] Grafana: `http://localhost:3001`

### GA Gate: contribution-grade validation (pre-PR)

- [ ] Run the enforced pre-flight:
  - `make ga`

- [ ] Confirm the gate covers the full readiness sequence (README states):
  - Lint & unit
  - Clean environment reset
  - Deep health checks
  - E2E smoke tests
  - Security scanning

### First contribution workflow (recommended)

- [ ] Pick a bounded area (examples by directory):
  - UI: `client/` or `conductor-ui/`
  - Backend/API: `backend/`, `api/`, `api-schemas/`
  - Orchestration: `.maestro/`, `.orchestrator/`
  - Ops/Governance: `runbooks/`, `SECURITY/`, `compliance/`, `audit/`, `.ga-check/`

- [ ] Create a branch using a consistent naming convention.
- [ ] Implement change + tests.
- [ ] Re-run `make ga` before opening PR (treat as non-negotiable).

### "If it fails" triage checklist

- [ ] Re-run `make ga` after a clean reset (the gate includes a reset stage; reproduce locally).
- [ ] If service endpoints fail, validate Docker services are up (compose/ and charts/ exist as repo-level infrastructure hints).
- [ ] If tests are brittle, consult `TESTING.md` (explicitly linked from README as the test runtime source of truth).

---

## Part 2: Legal & HR Onboarding Playbook

This playbook explains how to bring new employees, contractors, and partners into the IntelGraph program while satisfying security, legal, and productivity requirements.

### 1. Pre-Start Checklist (7–10 days before start)

| Task | Owner | Notes |
| --- | --- | --- |
| Send welcome email with start date, role summary, and point-of-contact list | People Ops | Include links to `docs/DEVELOPER_ONBOARDING.md` and the new-hire FAQ. |
| Collect required personal information and equipment preferences | People Ops | Record in HRIS and create hardware provisioning ticket. |
| Issue agreement packet via e-sign provider | Legal / People Ops | Use the templates in [`docs/legal/AGREEMENTS_TEMPLATES.md`](legal/AGREEMENTS_TEMPLATES.md); confirm jurisdiction-specific modifications with counsel. |
| Confirm background check and employment eligibility requirements | People Ops | Ensure results are logged before Day 1. |
| Create onboarding tracker entry | Hiring Manager | Track completion status for agreements, hardware, and systems access. |

### 2. Day 1 Priorities

1. **Verify Agreements:** Check the onboarding tracker to confirm signed copies of the NDA, proprietary information & inventions assignment, and any applicable contractor or non-compete agreements are stored in the legal repository.
2. **Account Provisioning:** After Legal marks agreements as complete, provision SSO, password manager, source control, and ticketing access. Delay access if any legal instrument is missing.
3. **Orientation Session:** Provide a 30-minute walkthrough covering company mission, key contacts, communication norms, and security expectations.
4. **Workstation Setup:** Ensure the new teammate completes the steps in [`docs/DEVELOPER_ONBOARDING.md`](DEVELOPER_ONBOARDING.md) to get a working development environment.

### 3. Week 1 Milestones

- Schedule security training (information handling, phishing, device hardening) within the first 48 hours.
- Pair each new teammate with a buddy who can answer process and tooling questions.
- Confirm the new teammate has read and acknowledged key policies: Code of Conduct, Security & Privacy, Incident Response, and Data Retention.
- Review role-specific expectations and OKRs by the end of the first week.

### 4. Required Agreements & Documentation

Use the agreement templates as the source of truth and capture completion in the onboarding tracker:

| Instrument | Required For | Storage Location | Renewal/Review |
| --- | --- | --- | --- |
| Mutual NDA | All employees, contractors, strategic partners | `legal/contracts/<year>/<counterparty>/nda.pdf` | Review annually for active partners |
| Proprietary Information & Inventions Assignment | Full-time and part-time employees | Same repository, suffix `-piaia.pdf` | Update if role changes materially |
| Contractor/Partner Confidentiality & IP Agreement | Vendors, agencies, fractional specialists | Same repository, suffix `-contractor-ip.pdf` | Review with each new Statement of Work |
| Non-Compete (jurisdiction-dependent) | Roles with heightened competitive risk where enforceable | Same repository, suffix `-noncompete.pdf` | Validate enforceability annually |

If a template requires modification, collaborate with Legal to document the change in the contract record and update the template library so future packets stay consistent.

### 5. Systems & Access Governance

1. Open an access provisioning ticket only after Legal confirms agreement completion.
2. Grant least-privilege access aligned with the role profile; escalate requests for elevated permissions through Security.
3. Schedule an access review 30 days after start to validate needs and ensure no excess privileges remain.
4. Document any exceptions (e.g., expedited access before agreements finalize) in the risk register with remediation steps.

### 6. Offboarding Linkage

Maintain a link between onboarding and offboarding checklists to ensure all agreements can be referenced when someone departs. Update the offboarding checklist with repository paths and agreement types, making it easy to confirm return of assets and ongoing obligations (non-disclosure, non-compete, non-solicitation).

### 7. Continuous Improvement

- Capture feedback from each onboarding class in the retro board and review monthly.
- Reconcile the onboarding tracker with the legal agreements repository to confirm nothing is missing.
- Update this document and the agreement templates whenever regulations, policies, or business needs change.
