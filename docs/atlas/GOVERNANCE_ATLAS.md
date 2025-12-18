# ⚖️ Governance Atlas

This atlas maps the laws, standards, and enforcement mechanisms of the ecosystem. It is the "Legal Code" of the Summit platform.

## 🏛️ The Constitution

*   **`AGENTS.md`**: The supreme law. Defines coding standards, project structure, and agent behavior.
*   **`prompts/enterprise-4th-order.md`**: The strategic intent. Ensures alignment with high-level business goals.

## 👮 Enforcement Agencies (Automated)

Governance is not just text; it is code that runs on every commit.

| Mechanism | Scope | Enforces | Configuration |
|-----------|-------|----------|---------------|
| **CI Pipeline** | Code Quality | Linting, Testing, Build Success | `.github/workflows/ci.yml` |
| **OPA (Open Policy Agent)** | Security & Compliance | RBAC, Data Safety, Cloud Config | `policy/*.rego` |
| **SLO Gate** | Performance | Latency (p95), Error Rates | `.github/workflows/k6-load.yml` |
| **Dependency Review** | Supply Chain | License Compliance, Vulnerabilities | `.github/workflows/security.yml` |
| **CommitLint** | Git History | Conventional Commits format | `commitlint.config.js` |

## 📜 Policy Library

### Security Policies
*   Located in: `policy/`
*   **Access Control:** `policy/rbac.rego`
*   **Data Sensitivity:** `policy/data_science.rego`
*   **Infrastructure:** `policy/terraform.rego`

### Operational Policies
*   **Release Management:** Defined in `.github/workflows/release.yml`.
*   **Incident Response:** Documented in `docs/runbooks/`.

## 📝 Governance Documents

*   **`GOVERNANCE_DESIGN.md`**: The theoretical framework for the governance system.
*   **`GOVERNANCE_IMPLEMENTATION_CHECKLIST.md`**: The roadmap for implementing governance controls.
*   **`GOVERNANCE_README.md`**: Overview of the governance module.

## 🔄 Decision Flow

1.  **Standard Definition:** Humans (or Architects) define a standard in `AGENTS.md`.
2.  **Policy Codification:** The standard is translated into a `.rego` policy or ESLint rule.
3.  **Automated Enforcement:** The CI pipeline rejects any change violating the policy.
4.  **Audit Trail:** The violation and its resolution are logged in the `Provenance Ledger`.
