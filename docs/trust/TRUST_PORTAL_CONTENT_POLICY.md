# Trust Portal Content Policy

## Purpose
To define what information is safe to publish in the Trust Portal and what must be redacted to protect the security and privacy of Summit and its customers.

## Classification Levels

| Level | Description | Examples | Handling |
| :--- | :--- | :--- | :--- |
| **Public** | Safe for the world. | Marketing, Docs, Signatures, Checksums, SBOMs (Library versions). | Publish to Portal. |
| **Confidential** | Customer/NDA only. | SOC 2 Report, Pen Test Detail, detailed architecture diagrams. | Gated / Request Access. |
| **Restricted** | Internal only. | Secrets, Internal IPs, vulnerability specifics before patch, PII. | **NEVER PUBLISH.** |

## Redaction Rules

### 1. Secrets & Credentials
*   **Rule**: No API keys, passwords, tokens, or private keys.
*   **Enforcement**: Automated secret scanning (e.g., Trivy, Gitleaks) before bundle generation.

### 2. Infrastructure Details
*   **Rule**: No internal IP addresses, internal DNS names (e.g., `*.int.summit.corp`), or specific server hostnames.
*   **Allowed**: Public endpoints (e.g., `api.summit.com`).

### 3. Personnel
*   **Rule**: No personal employee names, email addresses, or phone numbers in public docs. Use role-based contacts (e.g., `security@`).
*   **Exception**: Publicly known leadership if approved.

### 4. Vulnerability Data
*   **Rule**: No discussion of unpatched vulnerabilities. Patched vulnerabilities in release notes should use CVE IDs or generic descriptions ("Fixed improper input validation").

### 5. Supply Chain (SBOM)
*   **Rule**: SBOMs generally safe, but verify no internal private packages are exposed if their names reveal proprietary logic.

## Approval Workflow
1.  **Automated**: Release pipeline runs `scripts/trust/redact_public_artifacts.ts`.
2.  **Manual**: Significant updates to the "Security Program Overview" or new Compliance Certifications require Head of Security approval.
3.  **Auditor**: External audit reports are released only after final sign-off.
