# War Room Checklist

This document describes the purpose and usage of the auto-generated "War Room Checklist".

## 1. What It Is

The War Room Checklist is a deterministic, minute-by-minute guide for running a release meeting. It is generated automatically as part of the release CI/CD pipeline and is tailored to a specific release channel and target (e.g., `ga/v1.2.3`).

**Key principles:**
- **Deterministic:** The checklist is generated from existing release artifacts. It does not invent facts.
- **Evidence-Based:** All preconditions and checks are linked to source-of-truth artifacts in the repository.
- **Practical:** The checklist provides clear, role-based steps to follow during the high-pressure environment of a release meeting.

## 2. How to Generate It

The checklist is generated automatically by the `release-ga.yml` workflow and uploaded as an artifact named `release-war-room-checklist`.

To generate it manually, run the following command from the repository root:

```bash
./scripts/release/generate_war_room_checklist.mjs \\
  --channel <rc|ga> \\
  --target <git-tag-or-sha> \\
  --out artifacts/release-war-room/WAR_ROOM.md
```

**Prerequisites for manual generation:**
The script requires the following artifacts to exist:
- `artifacts/signoff/decision.json`
- `artifacts/release-readiness/onepager.md`
- `artifacts/release-cut/plan.md`

## 3. How to Use It in a Meeting

1.  **Designate Roles:** Before the meeting, assign the roles listed in the "Roles & Responsibilities" section (Release Lead, Scribe, etc.).
2.  **Review Preconditions:** The Release Lead should walk through the "Preconditions" section. If any are not met (especially the "ELIGIBLE" decision), the release should be halted.
3.  **Follow the Agenda:** The checklist provides a timeboxed agenda (T-15, T-10, etc.). The Scribe should mark items as "Done" as they are completed.
4.  **Execute the Script:** The "Execution Script" section contains the core steps of the release, including final approvals and commands to run. The CI Operator should follow these steps precisely.
5.  **Monitor for Stop Conditions:** All participants should be aware of the "Stop / Rollback Criteria." If any of these are met, the Release Lead must make the call to stop and initiate the rollback plan.
6.  **Consult Evidence:** The "Evidence Index" provides quick links to all the artifacts that informed the checklist.

## 4. Customizing Roles

The roles in the checklist are generic (`Release Lead`, `CI Operator`, etc.). Your organization may have different titles. The intention is not to change the generator script, but to map these roles to your team's structure during the meeting.

For example:
- **Release Lead** might be your Engineering Manager.
- **CI Operator** might be the developer on call.
- **Infra/Deploy** might be your SRE team representative.

The key is that the *responsibilities* are covered, not that the titles match exactly.
