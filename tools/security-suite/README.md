# Summit Security Suite

This directory contains a suite of automated security tools designed to continuously assess the security posture of the Summit platform.

## Tools

### 1. STRIDE Threat Modeler (`stride_modeler.py`)
Analyzes the codebase (routes and data stores) to identify potential threats using the STRIDE framework (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
- **Output**: `docs/security/THREAT_MODEL_REPORT.md`

### 2. Data Flow Diagram Generator (`data_flow_gen.py`)
Parses the codebase to generate a Mermaid JS Data Flow Diagram based on controller-service-repository interactions.
- **Output**: `docs/security/DATA_FLOW_DIAGRAM.md`

### 3. Security Scorecard (`security_scorecard.py`)
Evaluates the codebase against security metrics such as Authentication Coverage, Secrets Management, and Input Validation.
- **Output**: `docs/security/SECURITY_SCORECARD.json`

### 4. Vulnerability Scanner (`vuln_scanner.py`)
Wraps industry-standard tools (`npm audit`, `trivy`) to scan dependencies and filesystems for known vulnerabilities.

### 5. Checklist Generator (`checklist_gen.py`)
Generates a security review checklist for Pull Requests based on the types of files modified.
- **Output**: `docs/security/PR_SECURITY_CHECKLIST.md`

## Usage

To run the full suite:

```bash
./tools/security-suite/run_suite.py
```

Or run individual tools:

```bash
./tools/security-suite/stride_modeler.py
```

## Regression Tests

Security regression tests are located in `server/tests/security/`. Run them with:

```bash
cd server && npm test tests/security/security_regression.test.js
```

## Playbooks

Incident response playbooks are located in `docs/security/playbooks/`.
