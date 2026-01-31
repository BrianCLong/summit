# Certification Registry

The Registry is the single source of truth for all valid certificates.

## 1. Registry Structure

The registry is publicly accessible (read-only) and cryptographically verifiable.

**Location:** `https://trust.platform.com/registry` (Concept)

### Schema
```json
{
  "entities": {
    "com.example.partner": {
      "type": "partner",
      "level": "verified",
      "status": "active",
      "validUntil": "2025-12-31",
      "evidenceUrl": "https://..."
    },
    "com.example.plugin.analytics": {
      "type": "plugin",
      "level": "audited",
      "status": "revoked",
      "revocationReason": "security_vulnerability",
      "revokedAt": "2025-10-01"
    }
  }
}
```

## 2. Public Access
*   **Search:** By ID, Name, or Domain.
*   **Verification:** APIs to validate a certificate blob against the registry.

## 3. Evidence Links
Certificates link to *sanitized* evidence packs. Sensitive internal audits are not public, but the *fact* of the audit (and the auditor's signature) is.
