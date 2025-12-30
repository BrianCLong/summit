# PR Review Policy & Risk Classification

## Overview
This policy defines how Pull Requests are classified by risk and the corresponding review requirements.

## Risk Levels

### 🔴 High Risk
**Triggers:**
- Changes to Authentication/Authorization (`auth/`, `security/`)
- Cryptography changes (`crypto/`)
- Secret handling or configuration (`.env`, `secrets`)
- Core security infrastructure

**Requirements:**
- **2 Approvals** required (at least 1 from Security Team).
- Mandatory manual security testing.
- Full regression suite pass.

### 🟡 Medium Risk
**Triggers:**
- Standard application logic (Code changes not matched by High/Low rules).
- API endpoint modifications.
- Frontend logic changes.

**Requirements:**
- **1 Approval** required (Peer review).
- Unit and Integration tests must pass.

### 🟢 Low Risk
**Triggers:**
- Documentation only (`docs/`, `*.md`).
- Formatting/Linting changes.
- Asset updates (images, text).

**Requirements:**
- **1 Approval** required (can be automated if author is trusted).
- CI checks (lint/docs) must pass.

## Automation
The `scripts/classify-risk.ts` script automatically tags PRs based on the file paths modified.
- **Input**: List of changed files.
- **Output**: Risk level (low/medium/high).

## Security Checklist
All PRs must adhere to the Security Checklist in the PR Template.
