
# ComplianceForge AI

## Overview
**ComplianceForge AI** is an automated governance tool designed to scan repositories for shadow risks (e.g., secrets, PII) and generate audit-ready artifacts for standards like NIST, SOC2, and HIPAA.

## Key Features
- **Shadow Risk Scanning**: Detects hardcoded secrets, PII, and unencrypted storage references.
- **Auto-Artifact Generation**: Produces signed JSON audit trails.
- **Dynamic Policy Enforcement**: (Simulated) Policy engine to gate non-compliant code.

## Usage

### API

**Endpoint**: `POST /api/compliance-forge/scan`

**Body**:
```json
{
  "standard": "SOC2",
  "files": {
    "app.config": "db_password=secret",
    "main.js": "console.log('init')"
  }
}
```

**Response**:
```json
{
  "scanResults": [
      { "file": "app.config", "risks": ["..."], "complianceScore": 50 }
  ],
  "artifact": {
      "id": "audit-uuid",
      "status": "non_compliant",
      "signature": "SIG-X1Y2"
  }
}
```

## Architecture
- `ComplianceScanner`: Regex-based heuristic scanner.
- `ArtifactGenerator`: Creates immutable audit records.
- `PolicyEngine`: Logic for boolean policy decisions.
