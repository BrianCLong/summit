# Required Checks Discovery & Mapping (TODO)

This document tracks the required CI checks for branch protection and maps them to Summit's Repo Defense Plane (RDP).

## Discovery Steps
1. Navigate to GitHub Settings > Branches.
2. Under "Branch protection rules", click "Edit" on `main`.
3. Check the "Require status checks to pass before merging" section.
4. Record exact check names and update this document.

GitHub API (optional):
- `GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks`

## Temporary Local Check Names
- `ci/summit-security-foundation` (Maps to RDP PR1)
- `ci/summit-security-gates` (Maps to RDP PR2)
- `ci/summit-security-deps` (Maps to RDP PR3)

## Evidence Mapping
| Evidence ID | Description | CI Gate |
| ----------- | ----------- | ------- |
| EVD-GITHUB_ESPIONAGE-SCHEMA-001 | Evidence schema pack present & validates | `ci/summit-security-foundation` |
| EVD-GITHUB_ESPIONAGE-GATES-001  | Security gates (WF, Leak, Fork) validation | `ci/summit-security-gates` |
| EVD-GITHUB_ESPIONAGE-DEPS-001   | Dependency allowlist + delta enforcement | `ci/summit-security-deps` |

## Branch Protection Goals
- [ ] `ci/summit-evidence-validate`
- [ ] `ci/summit-determinism`
- [ ] `ci/summit-dependency-delta`
- [ ] `ci/summit-unit`

Rename plan: add aliases for 1 release cycle, then remove old names.
