# Copilot Agentic Review Standard

## Import/Export Matrix
| Surface | Import | Export | Status |
|---|---|---|---|
| GitHub PR | diff, metadata, changed paths | findings, checks, artifacts | v1 |
| GitHub Issues | drift incidents | issue creation/update | v1 |
| SBOM/Vuln scanners | advisory feeds | policy outcome | v1 |
| CodeQL | SARIF / summary | merged evidence refs | v1 ASSUMPTION |
| GitLab MR | diff, metadata | findings | non-goal for now |
| Bitbucket PR | diff, metadata | findings | non-goal for now |

## Non-Goals
- autonomous merge
- autonomous wide-scope refactors
- human-free release approval
- broad repo rewrites for style-only issues
