# Security Gates & Policy

> **Goal**: Ensure no critical/high vulnerability dependencies or secrets are introduced into `main`.

## 1. Overview

The Summit Platform enforces security baselines via CI gates and local tooling. These gates are mandatory for the "Golden Path" to GA.

| Gate | Scope | Threshold | Tooling |
| :--- | :--- | :--- | :--- |
| **Dependency Audit** | Production Dependencies | **Critical / High** | `pnpm audit`, `scripts/ci/security_audit_gate.mjs` |
| **Secrets Scan** | Codebase + History | **Any Secret** | `gitleaks`, `scripts/ci/scan_secrets.sh` |
| **License Check** | Production Dependencies | **Banned Licenses** | (Planned for MVP-5) |

---

## 2. Dependency Audit

We scan all **production** dependencies for known vulnerabilities.

### Local Usage
```bash
# Run the same check as CI
node scripts/ci/security_audit_gate.mjs
```

### CI Enforcement
- **Workflow**: `Release GA Pipeline` (`release-ga-pipeline.yml`)
- **Job**: `verify` -> `Security Guardrails`
- **Failure Condition**: Any vulnerability with severity `High` or `Critical`.

### Remediation
If the gate fails:
1.  **Identify**: Run `pnpm audit --prod` to see the path.
2.  **Fix**:
    - **Direct**: `pnpm up <package>`
    - **Transitive**: Add an override to `package.json` > `pnpm.overrides`.
    - **Rebuild**: `pnpm install` regarding lockfile.

---

## 3. Secrets Scanning

We verify no secrets (keys, tokens, passwords) are committed.

### Local Usage
```bash
# Scans staged files (ideal for pre-commit)
./scripts/ci/scan_secrets.sh
```

### CI Enforcement
- **Workflow**: `Release GA Pipeline`
- **Mode**: Scans full history (incremental or deep depending on context).

### Remediation
If a secret is found:
1.  **Rotate**: The secret is compromised. Revoke and rotate it immediately.
2.  **Remove**: Remove the secret from code.
3.  **Sanitize**: If committed to history, use `git filter-repo` or BFG (consult Security Team).

---

## 4. Exceptions

Exceptions (waivers) are handled via:
- **Dependencies**: explicit `pnpm.overrides` pinning a safe version or (rarely) `pnpm audit` configuration to ignore specific advisory IDs (requires Security Team approval).
- **Secrets**: `.gitleaks.toml` allowlist (strict review required).
