# Adoption Plan: GitHub Repository Dashboard for Summit GA Readiness

**Status:** PLANNED
**Owner:** Engineering Operations
**Date:** February 24, 2026

## Objective

Leverage the native **GitHub Repository Dashboard** to streamline operational monitoring and automate evidence collection for Summit's General Availability (GA) release.

## Background

The GitHub Repository Dashboard provides a unified view of PRs, issues, deployments, and CI status. Currently, Summit relies on manual scripts (`scripts/github_inventory.sh`) to collect this data for GA evidence bundles. Adopting the Dashboard allows for real-time visibility and potential automation of these snapshots.

## Implementation Roadmap

### Phase 1: Configuration & Alignment (Q1 2026)
*   **Standardize Dashboard Views**: Configure organization-wide defaults for the Repository Dashboard to ensure all Summit repos (Switchboard, Maestro, IntelGraph, CompanyOS) display consistent metrics.
*   **Card Customization**: Enable cards for "Code Quality" (Security), "Recent Releases," and "Workflow Status" as primary indicators.
*   **Team Training**: Conduct a brief session for maintainers on using the Dashboard for daily triage.

### Phase 2: Evidence Automation (Q2 2026)
*   **Inventory Script Update**: Modify `scripts/github_inventory.sh` to optionally pull data from the Dashboard API (if available) or link directly to Dashboard snapshots.
*   **GA Gate Integration**: Update the `GovernanceVerdict` workflow to check specific Dashboard-surfaced metrics (e.g., "0 High/Critical security alerts") before allowing merges to `main`.
*   **Provenance Linking**: Link Dashboard deployment history to Summit's cryptographically-chained audit trails.

### Phase 3: Advanced Intelligence (Q3 2026)
*   **Custom Dashboard Cards**: Develop custom GitHub Action-based cards that surface Summit-specific governance verdicts directly on the GitHub Dashboard.
*   **Predictive Hotspots**: Use Dashboard activity trends to feed Summit's own "Execution Saturation" and "Risk Drift" models.

## Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Information Overload** | Medium | Filter Dashboard cards to show only Tier-0/Blocker issues and critical CI paths. |
| **Privacy/Security** | High | Ensure Dashboard visibility aligns with repository-level RBAC; do not surface sensitive PR/Issue content in global summaries. |
| **Tool Sprawl** | Low | Frame the Dashboard as a "front door" to existing tools (Actions, Issues, Security) rather than a replacement. |
| **API Rate Limits** | Medium | Cache dashboard metrics where possible if using automated inventory scripts. |

## Integration with GA Readiness

The Repository Dashboard will serve as the primary "Pulse" for the following GA requirements:
*   **Operational Awareness**: Real-time status of `ci-comprehensive.yml` across all repos.
*   **Security Posture**: Instant view of Dependabot and CodeQL alerts.
*   **Release Integrity**: Verification of deployment history and release cadence.

## Success Metrics

*   **Triage Time**: 20% reduction in time-to-first-response for high-priority issues.
*   **Evidence Collection**: 50% reduction in manual effort for generating `inventory.txt` snapshots.
*   **Team Adoption**: 100% of maintainers using the Dashboard as their primary entry point for repo health.

## References

*   [Internal Announcement: GitHub Dashboard GA](../comms/2026-02-24-github-dashboard-ga.md)
*   [Competitive Analysis: GitHub Dashboard vs. Summit Intelligence](../competitive/github-dashboard-analysis.md)
*   [GitHub Inventory Runbook](./GITHUB_INVENTORY.md)
