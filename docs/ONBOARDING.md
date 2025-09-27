# Onboarding

This playbook explains how to bring new employees, contractors, and partners into the IntelGraph program while satisfying security, legal, and productivity requirements.

## 1. Pre-Start Checklist (7–10 days before start)

| Task | Owner | Notes |
| --- | --- | --- |
| Send welcome email with start date, role summary, and point-of-contact list | People Ops | Include links to `docs/DEVELOPER_ONBOARDING.md` and the new-hire FAQ. |
| Collect required personal information and equipment preferences | People Ops | Record in HRIS and create hardware provisioning ticket. |
| Issue agreement packet via e-sign provider | Legal / People Ops | Use the templates in [`docs/legal/AGREEMENTS_TEMPLATES.md`](legal/AGREEMENTS_TEMPLATES.md); confirm jurisdiction-specific modifications with counsel. |
| Confirm background check and employment eligibility requirements | People Ops | Ensure results are logged before Day 1. |
| Create onboarding tracker entry | Hiring Manager | Track completion status for agreements, hardware, and systems access. |

## 2. Day 1 Priorities

1. **Verify Agreements:** Check the onboarding tracker to confirm signed copies of the NDA, proprietary information & inventions assignment, and any applicable contractor or non-compete agreements are stored in the legal repository.
2. **Account Provisioning:** After Legal marks agreements as complete, provision SSO, password manager, source control, and ticketing access. Delay access if any legal instrument is missing.
3. **Orientation Session:** Provide a 30-minute walkthrough covering company mission, key contacts, communication norms, and security expectations.
4. **Workstation Setup:** Ensure the new teammate completes the steps in [`docs/DEVELOPER_ONBOARDING.md`](DEVELOPER_ONBOARDING.md) to get a working development environment.

## 3. Week 1 Milestones

- Schedule security training (information handling, phishing, device hardening) within the first 48 hours.
- Pair each new teammate with a buddy who can answer process and tooling questions.
- Confirm the new teammate has read and acknowledged key policies: Code of Conduct, Security & Privacy, Incident Response, and Data Retention.
- Review role-specific expectations and OKRs by the end of the first week.

## 4. Required Agreements & Documentation

Use the agreement templates as the source of truth and capture completion in the onboarding tracker:

| Instrument | Required For | Storage Location | Renewal/Review |
| --- | --- | --- | --- |
| Mutual NDA | All employees, contractors, strategic partners | `legal/contracts/<year>/<counterparty>/nda.pdf` | Review annually for active partners |
| Proprietary Information & Inventions Assignment | Full-time and part-time employees | Same repository, suffix `-piaia.pdf` | Update if role changes materially |
| Contractor/Partner Confidentiality & IP Agreement | Vendors, agencies, fractional specialists | Same repository, suffix `-contractor-ip.pdf` | Review with each new Statement of Work |
| Non-Compete (jurisdiction-dependent) | Roles with heightened competitive risk where enforceable | Same repository, suffix `-noncompete.pdf` | Validate enforceability annually |

If a template requires modification, collaborate with Legal to document the change in the contract record and update the template library so future packets stay consistent.

## 5. Systems & Access Governance

1. Open an access provisioning ticket only after Legal confirms agreement completion.
2. Grant least-privilege access aligned with the role profile; escalate requests for elevated permissions through Security.
3. Schedule an access review 30 days after start to validate needs and ensure no excess privileges remain.
4. Document any exceptions (e.g., expedited access before agreements finalize) in the risk register with remediation steps.

## 6. Offboarding Linkage

Maintain a link between onboarding and offboarding checklists to ensure all agreements can be referenced when someone departs. Update the offboarding checklist with repository paths and agreement types, making it easy to confirm return of assets and ongoing obligations (non-disclosure, non-compete, non-solicitation).

## 7. Continuous Improvement

- Capture feedback from each onboarding class in the retro board and review monthly.
- Reconcile the onboarding tracker with the legal agreements repository to confirm nothing is missing.
- Update this document and the agreement templates whenever regulations, policies, or business needs change.
