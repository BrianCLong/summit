# Evidence and Verification

The claims made in this Trust Portal are designed to be verifiable. This document outlines the sources of evidence and provides instructions for how an external party can verify our security and reliability posture.

## Sources of Evidence

Our trust assertions are based on two primary sources of evidence within this repository:

1.  **Automated CI/CD Workflows:** Our GitHub Actions workflows, located in the `.github/workflows/` directory, define the exact sequence of checks, tests, and scans that are run on every change. The most critical workflows for verification are:
    *   ` .github/workflows/ci.yml`: The main Continuous Integration pipeline.
    *   ` .github/workflows/ci-security.yml`: The dedicated security scanning and compliance pipeline.

2.  **Version-Controlled Documents:** Key strategic documents are stored and versioned alongside our code, ensuring a transparent and auditable record of our posture. These include:
    *   `docs/SUMMIT_READINESS_ASSERTION.md`: A formal declaration of the platform's production readiness and certified capabilities.
    *   `docs/RISK_LEDGER.md`: A living document tracking all identified systemic risks and their neutralization status.

## How an External Party Can Verify

Verification can be performed by reviewing our workflow configurations and by running our primary verification command locally.

### 1. Review the CI/CD Pipeline

The most direct way to verify our claims is to inspect the CI workflow files. These YAML files are the source of truth for our automated gates and show the precise commands, tools, and configurations we use to enforce our standards.

### 2. Run the Golden Path Verification Command

We provide a single command to execute our "Golden Path" smoke test, which validates the core end-to-end functionality of the Summit platform. This is the same core verification step that runs in our CI pipeline.

To run the verification suite locally, you need Docker and `make` installed. Then, execute the following command from the repository root:

```bash
make smoke
```

A successful execution of this command provides a strong signal that the core platform is functioning as expected.
