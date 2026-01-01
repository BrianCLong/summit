# Plugin & Extension Certification

Plugins extend the platform's capabilities. Certification ensures they do so safely, securely, and reliably.

## 1. Certification Rules

### 1.1 Policy Compliance
All plugins must adhere to the platform's core policies:
*   **Privacy:** No unauthorized data exfiltration.
*   **Security:** No introduction of new vulnerabilities.
*   **Performance:** Adherence to compute and memory budgets.

### 1.2 Autonomy Tier Caps
Plugins are certified for a specific maximum Autonomy Tier.
*   **Tier 0 (Manual):** Plugin provides data/tools, human acts.
*   **Tier 1 (Assisted):** Plugin suggests actions.
*   **Tier 2 (Semi-Autonomous):** Plugin acts with oversight.
*   **Tier 3 (Autonomous):** Plugin acts independently (Requires **Audited** level).

### 1.3 Cost & Risk Attribution
*   Plugins must expose metrics for cost attribution (tokens, CPU, API calls).
*   Risk scores are calculated dynamically based on permissions requested.

## 2. Certification Process

1.  **Submission:** Developer submits `plugin.json` and `certification_manifest.json`.
2.  **Automated Check:** `verify_conformance.ts` runs against the submission.
3.  **Review:** Platform team (or delegate) reviews for logic and malicious patterns.
4.  **Issuance:** A cryptographic receipt (Certificate) is issued.

## 3. Certification Receipts

A valid certificate is a JSON object signed by the Platform Authority.

```json
{
  "pluginId": "com.example.myplugin",
  "version": "1.2.0",
  "level": "verified",
  "autonomyCap": 2,
  "issuedAt": "2025-10-27T10:00:00Z",
  "expiresAt": "2026-10-27T10:00:00Z",
  "issuer": "PlatformTrustAuthority",
  "signature": "..."
}
```

## 4. Coordination Compatibility

Certified plugins must implement the standard `CoordinationInterface` to ensure they play nicely with other plugins and the Maestro orchestrator.
