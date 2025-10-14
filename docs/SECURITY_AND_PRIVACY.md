# Security & Privacy

- **AuthN/Z:** JWT + **ABAC**; policy labels on entities/edges; deny by default.
- **Data Minimization:** only store necessary fields; redact PII in logs; DP for shared exports (ε configurable).
- **Secrets:** gitleaks PR gate; GitHub secret scanning + push protection.
- **SBOM & Scans:** Dependabot, pip‑audit/npm audit, CodeQL for public repos.
- **Provenance Integrity:** optional signing (cosign) + blockchain anchoring (see `ADR/0002`).