# Threat Model: OSINT & Investigations Subsumption

## 1. Misuse/Abuse Scenarios
* **Mass Scraping/ToS Violations:** Automated agents performing unregulated scraping or violating the terms of service of integrated platforms (e.g., Social Links, SpiderFoot modules).
* **Unlawful Collection:** Collection of data that violates privacy regulations (GDPR, CCPA) or operates outside of lawful OSINT boundaries.
* **Prompt Injection/Tool Abuse:** Malicious input designed to subvert agent instructions, leading to unauthorized tool execution or exfiltration of sensitive intel.
* **Data Exfiltration:** Insider threats or compromised accounts exporting sensitive case artifacts or intelligence graphs.

## 2. Policy Engine Design
* **Connector Allowlists:** Strict enumeration of authorized connectors per tenant.
* **ToS Enforcement:** Connectors must include metadata tags detailing ToS constraints, enforced by the policy engine before execution.
* **Rate Limiting & Budgets:** Governance layer caps on API calls to prevent runaway agents and manage costs.

## 3. Tenant Isolation & Residency Controls
* **Per-Tenant Encryption:** Unique encryption keys for each tenant's intelligence graph and artifacts.
* **Data Residency:** Storage backends dynamically provisioned based on tenant residency requirements.
* **Air-Gapped Mode:** Capability to completely disable external tool connectors, relying solely on local or internal data sources.

## 4. Evidence Integrity
* **Append-Only Ledger:** Evidence artifacts (`report.json`, `metrics.json`, `stamp.json`) are written to an append-only datastore.
* **Hash Chaining:** Each artifact is hashed, and hashes are linked to form a verifiable chain of custody.
* **Digital Signatures:** Optional signing of artifacts to cryptographically guarantee origin and non-repudiation.

## 5. Secrets Management
* **Vault Integration:** API keys and credentials for external connectors (e.g., Social Links API, Orpheus) are stored in a secure vault, not in environment variables or code.
* **Just-In-Time Access:** Agents request temporary, scoped access to credentials only when executing a specific tool call.

## 6. Security Test Plan & CI Gates
* **Automated DAST/SAST:** Scanning of all connector and agent code for vulnerabilities.
* **Penetration Testing:** Regular third-party assessments focusing on tenant isolation and tool abuse scenarios.
* **CI Validation:** Automated verification that new connectors conform to policy engine requirements (e.g., presence of ToS tags).

## 7. SBOM & Provenance Hooks
* **Dependency Tracking:** Generation of CycloneDX/SPDX SBOMs during CI/CD.
* **Attestation Storage:** SBOMs and build provenance attestations are stored alongside evidence artifacts (`stamp.json`).
