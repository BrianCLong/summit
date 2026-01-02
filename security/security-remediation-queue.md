# Security Remediation Queue (Top 10)

| Rank | Item                                                                            | Source          | Severity | Notes / Status                                                                                           |
| ---- | ------------------------------------------------------------------------------- | --------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| 1    | Enforce PR secret scanning (warn-only Gitleaks workflow)                        | Secret scanning | High     | Converted to blocking with baseline guard in this branch.                                                |
| 2    | Run full security suite on pull_request (currently schedule/workflow_call only) | CodeQL/SAST     | High     | Security and Compliance Suite is not wired to PRs; needs triggering + required check.                    |
| 3    | Enable dependency scanning by default                                           | Dependabot/Snyk | High     | `run_snyk` defaults to false; enable and make required for mainline.                                     |
| 4    | Expand CodeQL language coverage beyond JavaScript/Python                        | CodeQL          | Medium   | Monorepo includes other ecosystems (e.g., Rust); extend matrix and build steps.                          |
| 5    | Enforce SBOM generation + promotion gate                                        | Supply chain    | Medium   | Control VULN-02 requires SBOM attestation and CVE gate on releases.                                      |
| 6    | Enforce dependency provenance and signature/registry pinning                    | Supply chain    | Medium   | Control VULN-03 calls for provenance checks and lockfile enforcement.                                    |
| 7    | Remediate expr-eval prototype pollution vulnerability                           | Dependabot      | High     | Currently mitigated by validation only; need patched release or replacement.                             |
| 8    | Remediate transitive xlsx ReDoS/prototype pollution via node-nlp                | Dependabot      | Medium   | Replace dependency chain or vendor fixed version to remove vulnerable xlsx@0.18.5.                       |
| 9    | Add Python/pip ecosystem to Dependabot coverage                                 | Dependabot      | Medium   | Dependabot config omits pip despite Python codepaths in repo.                                            |
| 10   | Sync GitHub Security Center alerts (Dependabot/CodeQL/secret scanning)          | Other           | High     | GitHub project/security alerts inaccessible from this environment; pull latest findings and align queue. |
