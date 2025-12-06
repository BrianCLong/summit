# Security Scanning Tools Configuration

This repository integrates a comprehensive suite of automated security and quality scanning tools to ensure code health and prevent vulnerabilities.

## 🛡️ Integrated Tools

| Tool | Purpose | Workflow File | Schedule |
|------|---------|---------------|----------|
| **SonarCloud** | Code Quality, Coverage, & Security Hotspots | `.github/workflows/sonar-scan.yml` | Push & PR |
| **CodeQL** | Semantic Code Analysis & Vulnerability Detection | `.github/workflows/codeql-analysis.yml` | Daily & PR |
| **Trivy** | Container Image Scanning | `.github/workflows/trivy.yml` | Daily & PR |
| **OWASP ZAP** | Dynamic Application Security Testing (DAST) | `.github/workflows/owasp-zap.yml` | Weekly & PR |
| **Checkov** | Infrastructure as Code (IaC) Scanning | `.github/workflows/iac-scan.yml` | Push & PR |
| **Snyk / npm audit** | Dependency Vulnerability Scanning | `.github/workflows/security-scan.yml` | Daily & PR |
| **Gitleaks** | Secret Detection | `.github/workflows/security-scan.yml` | Push & PR |
| **License Checker** | License Compliance Verification | `.github/workflows/license-compliance.yml` | Weekly |

## ⚙️ Configuration Details

### 1. SonarCloud
**Config File:** `sonar-project.properties`
- **Goal:** Maintain >80% code coverage and 'A' rating on all metrics.
- **Key Metrics:**
  - Cyclomatic Complexity < 15 per function
  - Duplication < 5%
  - No critical bugs or security hotspots

### 2. CodeQL
**Config File:** `.github/workflows/codeql-analysis.yml`
- **Languages:** JavaScript, TypeScript
- **Queries:** `security-extended`, `security-and-quality`
- **Output:** SARIF uploaded to GitHub Security tab.

### 3. Dependency Scanning
- **Dependabot:** configured in `.github/dependabot.yml` for automated updates.
- **Snyk/Audit:** Runs in CI pipeline to block builds with critical vulnerabilities.

### 4. Secret Detection
**Config File:** `.pre-commit-config.yaml`
- Uses `gitleaks` and `trufflehog` to scan for patterns like API keys, tokens, and private keys.
- **Hook:** Runs on every commit via pre-commit and in CI.

### 5. Infrastructure as Code (IaC)
**Tool:** Checkov
- Scans Terraform, Kubernetes, and Helm charts.
- Checks against CIS benchmarks and best practices.

### 6. API Security (DAST)
**Tool:** OWASP ZAP
- Spawns a test environment (Postgres + Redis + API).
- Runs baseline scan against Web App, Mobile Interface, and GraphQL API.
- Reports uploaded as artifacts.

## 🚦 Handling Findings

1.  **Critical/High Severity:** Must be fixed immediately. PRs will be blocked.
2.  **False Positives:** Mark as "False Positive" in the respective dashboard (SonarCloud/GitHub Security) or add suppression comments in code.
    - **ESLint:** `// eslint-disable-next-line rule-name`
    - **Checkov:** `# checkov:skip=CKV_AWS_1: rationale`
3.  **Exceptions:** Require approval from Security Lead.

## 🛠️ Local Development

To run scans locally:
- **Lint/Audit:** `npm run lint && npm audit`
- **Secrets:** `pre-commit run --all-files`
- **Trivy:** `trivy fs .`
- **Sonar:** Use SonarLint plugin for your IDE.
