# Codex UI GitHub Issues Manifest

This manifest captures the prioritized Codex UI workstream initiatives and the metadata required to track them as GitHub issues. Use it to synchronize project planning tools, ensure consistent labeling, and provide quick visibility into go-to-market critical paths.

## How to Use This Manifest

- Create or update GitHub issues using the _Issue Title_ values below.
- Apply the provided labels to standardize priority, domain, and program alignment.
- Reference the described outcomes and dependencies when authoring acceptance criteria.
- Update the **Status** column as execution progresses to maintain a reliable source of truth.

## Prioritized Issue Tracker

| Issue Title                                                    | Priority | Domain / Program Tags                            | Desired Outcome                                                                                                | Status      |
| -------------------------------------------------------------- | -------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------- |
| Reliability & Chaos Program (GA Blocker)                       | P1       | `reliability`, `chaos-engineering`, `ga-blocker` | Comprehensive chaos and resilience testing framework executed with automated reporting, ensuring GA readiness. | To Do       |
| CompanyOS SDK Parity & Ecosystem Bridges                       | P0       | `sdk`, `integration`, `ecosystem`                | Feature parity across CompanyOS SDKs with bridges for strategic ecosystem integrations.                        | To Do       |
| Advanced AI/ML Extraction Pipeline                             | P1       | `ai-ml`, `data-pipeline`, `extraction`           | AI/ML-powered extraction pipeline delivering reliable structured outputs and monitoring.                       | To Do       |
| Air-Gap Offline Deploy v1                                      | P1       | `deployment`, `air-gap`, `infrastructure`        | First production-ready offline deployment pattern for isolated environments with documentation.                | To Do       |
| Analyst Assist v0.2                                            | P1       | `analyst-experience`, `assistants`, `product`    | Analyst assistance experience v0.2 delivered with workflow tooling upgrades.                                   | In Progress |
| IGAC/Provenance Governance: Pin Policy Bundle SHAs to Releases | P1       | `governance`, `security`, `policy`               | Policy bundle SHA pinning baked into release workflows with validation gates.                                  | To Do       |
| GTM Enablement (Cross-Cutting)                                 | P1       | `gtm`, `enablement`, `cross-cutting`             | Coordinated go-to-market readiness plan with aligned collateral, demos, and training.                          | In Progress |
| Compliance Evidence Automation                                 | P0/P1    | `compliance`, `automation`, `evidence`           | Automated evidence collection and reporting pipeline supporting compliance obligations.                        | Blocked     |
| Critical Blocker Resolution                                    | P0       | `ga-blocker`, `stability`, `triage`              | All critical issues blocking GA resolved with documented mitigations.                                          | In Progress |
| Policy & Security Hardening                                    | P0       | `security`, `policy`, `hardening`                | Hardened policy enforcement and security controls rolled out across services.                                  | To Do       |
| CompanyOS Q0 Foundation                                        | P0       | `companyos`, `foundation`, `platform`            | Foundational CompanyOS Q0 capabilities implemented with baseline SLAs.                                         | To Do       |

## Triage & Synchronization Notes

- **Standup Review:** Incorporate this manifest into Codex UI standups to track movement and surface blockers quickly.
- **Dashboard Integration:** Mirror priority and status fields into the Codex UI roadmap dashboard for stakeholder transparency.
- **Label Hygiene:** Ensure consistency of labels; discrepancies should be reconciled within 24 hours of discovery.
- **Dependency Tracking:** Highlight cross-team dependencies (e.g., security sign-off, infra readiness) directly in the associated GitHub issues.

_Last updated: 2025-10-06_
