# CI/CD Governance & Supply-Chain Assessment

## 1. Workflows Overview
- **Total Workflows**: 340 (includes GitHub-hosted and self-hosted/reusable).
- **Runners**: GitHub-hosted runners are the predominant type.
- **Paths & Triggers**: Extensive trigger use across pull requests, main pushes, and cron jobs. Includes GraphRAG pipelines and evaluation runs.

## 2. Dependency Pinning (SLSA Source/Build Requirement)
- **Unpinned Third-Party Actions**: Over 300 workflows use actions pinned by tags (e.g., `@v4`) rather than immutable SHAs.
- **Risk**: Tag mutability introduces supply-chain risk if an action's tag is moved to a malicious commit. Pinning to a SHA is a baseline SLSA recommendation.

## 3. Permissions & Least Privilege
- **Missing Explicit Permissions**: Over 190 workflows lack explicit `permissions:` blocks.
- **Risk**: They default to the repository's default token permissions, which may be overly permissive (`write-all`).

## 4. Secrets Usage
- **Total Unique Secrets Accessed**: 39 unique secrets detected.
- **Examples**: `AZURE_FEDERATED_ID`, `NEO4J_USER`, `GCP_PROVIDER`, `AWS_ACCESS_KEY_ID`, `BRANCH_PROTECTION_APP_ID`, `SIGSTORE_KEY`, `POSTGRES_URI`, `GITHUB_TOKEN`.
- **Usage**: Broad use in env vars and matrix jobs. Opportunities exist to scope secrets strictly to environments rather than repository-wide.

## 5. Posture Classification
**Current Posture:** Pre-SLSA / Approaching L2
- **Gaps:**
  - Widespread use of mutable action tags instead of SHAs.
  - Missing explicit, least-privilege `permissions` blocks in many workflows.
  - Secrets usage can be tightened with explicit OIDC where applicable (e.g., AWS/GCP).

## Next 3 CI Hardening Steps
1. **Systematic SHA pinning**: Transition all third-party GitHub Actions from tags to SHAs.
2. **Enforce explicit least-privilege `permissions` blocks**: Apply strict `read-all` or specific granular scopes across all remaining workflows.
3. **Audit and scope secrets**: Move away from repository-wide secrets where possible, using environments or OIDC identity federation for cloud providers.
