# CI/CD Security Standards

**Version**: 1.0
**Status**: MANDATORY
**Scope**: All build, test, and deployment pipelines (GitHub Actions, CodeBuild, n8n, etc.)

## 1. Trigger Filtering & Authorization

### 1.1 Strict Anchoring Requirement (Invariant)
All regular expression (regex) filters used to validate actors, repository names, branch names, or account IDs MUST be strictly anchored.

- **Mandatory Anchors**: Patterns MUST start with `^` and end with `$`.
- **Reasoning**: Prevents "substring bypass" attacks where an untrusted account (e.g., `attacker-12345`) matches a trusted account substring (`12345`).

### 1.2 Prefer Equality over Patterns
Where possible, use exact string equality instead of regex or pattern matching.

- **GitHub Actions**: Use `github.repository == 'owner/repo'` instead of `contains(...)`.
- **AWS CodeBuild**: Prefer exact match filters over regex filters if the platform supports it.

## 2. Least Privilege (OIDC & Secrets)

### 2.1 OIDC-First Authentication
Prefer GitHub OIDC (Workload Identity) over long-lived secrets (AWS Access Keys, GCP Service Account Keys).

- **Conditional Access**: OIDC trust policies MUST be scoped to specific environments or branches.
- **Repository Isolation**: Credentials used in forks MUST be read-only or restricted to non-privileged environments.

### 2.2 Secret Scope Management
- Never expose production secrets to `pull_request` triggers from forks.
- Use `pull_request_target` with extreme caution and mandatory approval gates.

## 3. Supply Chain Integrity

### 3.1 SHA Pinning
All third-party GitHub Actions MUST be pinned to a full length commit SHA.

- **Correct**: `uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2`
- **Incorrect**: `uses: actions/checkout@v4`

### 3.2 SBOM & Signature Verification
- Deployment pipelines MUST generate and sign an SBOM (Software Bill of Materials).
- Production rollouts MUST verify signatures before execution.

## 4. Enforcement

### 4.1 Static Analysis
The `workflow-lint` gate and `baseline-check.sh` script automatically audit CI configurations for compliance with these standards.

### 4.2 Manual Review
Changes to CI/CD workflows require a security-focused review from a Release Captain or Security DRI.

---
**Document Control**:
- **Owner**: Security Architecture / Release Operations
- **Approval**: Required for all GA-critical pipelines
