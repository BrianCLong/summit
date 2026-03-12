import os
import subprocess

issues_dir = "docs/project_management/issues"
os.makedirs(issues_dir, exist_ok=True)

issues = [
    {
        "filename": "sprint_08_unfinished_defensive_mitigations.md",
        "title": "Complete Unfinished Defensive Mitigations from Sprint 08",
        "priority": "P0",
        "labels": "`security`, `sprint-08`, `threat-model`, `ga-blocker`",
        "outcome": "Address all unfinished defensive mitigations and risk updates identified in THREAT_MODEL_DELTA_SPRINT_08.md.",
        "workstreams": "- Review THREAT_MODEL_DELTA_SPRINT_08.md for outstanding items.\n- Implement missing cryptographic controls and fail-closed mechanisms.\n- Update threat model documentation."
    },
    {
        "filename": "ga_readiness_gaps_integrations_test_coverage.md",
        "title": "Address GA Readiness Gaps: Integrations and Test Coverage",
        "priority": "P0",
        "labels": "`ga-blocker`, `testing`, `integrations`, `readiness`",
        "outcome": "Close the gaps in integrations and test coverage highlighted in the GA matrices and checklists.",
        "workstreams": "- Identify failing or incomplete tests across integrations.\n- Add E2E tests for external system integrations.\n- Update the GA readiness matrices."
    },
    {
        "filename": "ga_deferred_items_cut_list.md",
        "title": "Resolve Deferred Items from GA Cut Lists and Waivers",
        "priority": "P1",
        "labels": "`tech-debt`, `ga-deferred`, `waivers`",
        "outcome": "Review and implement or formally deprecate items deferred via GA waivers and cut lists.",
        "workstreams": "- Audit GA_WAIVER_TEMPLATES_AND_COMMS_PLAN.md and GA_CUT_LIST.md.\n- Prioritize deferred features and tech debt.\n- Schedule implementation in upcoming sprints."
    },
    {
        "filename": "information_warfare_roadmap_unfinished_phases.md",
        "title": "Execute Unfinished Phases of the 45-Sprint Information Warfare Defense Roadmap",
        "priority": "P1",
        "labels": "`roadmap`, `information-warfare`, `defense`",
        "outcome": "Continue execution of the 45-Sprint Information Warfare Defense Roadmap, addressing unfinished tasks in later phases.",
        "workstreams": "- Review INFORMATION_WARFARE_DEFENSE_ROADMAP_45_SPRINTS.md.\n- Identify tasks for advanced defense integrations.\n- Allocate to appropriate upcoming sprints."
    },
    {
        "filename": "sprint_12k_open_items.md",
        "title": "Resolve Open Items and Unfinished Tasks from Sprint 12K",
        "priority": "P1",
        "labels": "`sprint-12k`, `tech-debt`",
        "outcome": "Complete the open items and unfinished tasks noted in the Sprint 12K summary (LEARNINGS_SPRINT_12K.md).",
        "workstreams": "- Extract open tasks from LEARNINGS_SPRINT_12K.md.\n- Implement pending state reconstruction and ledger tests.\n- Update lab certification processes if required."
    },
    {
        "filename": "codex_tasks_beyond_92.md",
        "title": "Define and Track Codex Tasks Beyond 70-92",
        "priority": "P2",
        "labels": "`codex`, `roadmap`, `planning`",
        "outcome": "Ensure codex tasks beyond the recently added 70-92 are properly defined, tracked, and scheduled.",
        "workstreams": "- Review subsumption roadmap for upcoming codex tasks.\n- Define tasks 93+ with clear acceptance criteria.\n- Align with broader platform goals."
    },
    {
        "filename": "architecture_and_policy_gaps.md",
        "title": "Remediate Architecture and Policy Gaps for GA",
        "priority": "P0",
        "labels": "`architecture`, `policy`, `ga-blocker`, `governance`",
        "outcome": "Address outstanding architectural and policy gaps identified in GA readiness reports.",
        "workstreams": "- Review GA_ARCHITECTURE.md and GA_GOVERNANCE.md.\n- Finalize incomplete architectural blueprints.\n- Ensure all governance policies are fully implemented."
    }
]

for issue in issues:
    filepath = os.path.join(issues_dir, issue["filename"])
    content = f"""# Issue: {issue['title']}

**Priority:** {issue['priority']}
**Labels:** {issue['labels']}

## Desired Outcome

{issue['outcome']}

## Workstreams

{issue['workstreams']}

## Acceptance Criteria

- All tasks specified in the corresponding documentation have been reviewed and addressed.
- Changes have been tested and verified against the relevant sprint or GA criteria.
- Documentation has been updated to reflect completion.

## Dependencies & Risks

- May require coordination across multiple teams.
- Potential blockers if original requirements are outdated or lack context.
"""
    with open(filepath, "w") as f:
        f.write(content)

    subprocess.run(["git", "add", filepath])
    subprocess.run(["git", "commit", "-m", f"docs(issues): Create issue for {issue['title']}"])

print("All issues created and committed.")
