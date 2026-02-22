# Threat Model: Third-Party Integrations

**Subsystem:** Third-Party Integrations (SaaS connectors, IDP/SSO, billing, telemetry)
**Version:** 1.0
**Date:** 2025-12-27
**Methodology:** STRIDE
**Owner:** Security Architecture & Vendor Risk
**Status:** New coverage - hardening

## System Overview

Third-party integrations enable data exchange between Summit and external providers (identity providers, CRM/ITSM connectors, billing, analytics). Integrations rely on OAuth2/OIDC, API keys, webhooks, and outbound event streams. They extend Summit’s attack surface through credential handling, callback endpoints, and vendor SDKs.

### Architecture Components

- **Entry Points:** OAuth redirect URIs, webhook endpoints, outbound HTTPS calls, vendor SDK initialization
- **Dependencies:** Identity providers (Okta/AAD), SaaS APIs (CRM/ITSM), billing gateway, observability exporters
- **Data Flow:** Summit → Vendor API (push/pull), Vendor → Summit (webhooks), Summit ↔ IDP (tokens)
- **Technology Stack:** Node.js connectors, REST/GraphQL clients, webhook routers, secrets manager

---

## STRIDE Analysis

### S - Spoofing Identity

#### Threat 1.1: Compromised Vendor OAuth Tokens

**Description:** Stolen refresh/access tokens let attackers impersonate Summit or customers against vendor APIs.
**Attack Vector:** Token theft from logs, misconfigured storage, or intercepted OAuth redirects.
**DREAD Score:**

- Damage: 8
- Reproducibility: 7
- Exploitability: 7
- Affected Users: 8
- Discoverability: 7
- **Total: 7.4 (HIGH)**

**Existing Mitigation:**

- Tokens stored in secrets manager
- TLS enforced for OAuth callbacks

**Required Mitigation:**

- Rotate tokens automatically and detect anomalous token use by IP/device
- Enforce PKCE + state on all OAuth flows; disallow implicit grant
- Ban logging tokens; add CI rule to block accidental secrets (Gitleaks/Trivy)
- Implement just-in-time token scopes per integration and revoke on disconnect

**Framework Mapping:** SOC2 CC6.1/CC6.8, ISO 27001 A.5.15, NIST AC-6, HIPAA 164.312(a), GDPR Art. 32(1)(b)

**Gap Status:** ⚠️ PARTIAL - Rotation policy and anomaly detection pending

---

#### Threat 1.2: Webhook Sender Spoofing

**Description:** Attackers send forged webhook requests to import malicious data or trigger workflows.
**Attack Vector:** Unsigned webhooks or leaked shared secrets.
**DREAD Score:**

- Damage: 8
- Reproducibility: 8
- Exploitability: 6
- Affected Users: 7
- Discoverability: 7
- **Total: 7.2 (HIGH)**

**Existing Mitigation:**

- HTTPS enforced; firewall restricts origins where supported

**Required Mitigation:**

- Enforce signature verification (HMAC/Ed25519) per vendor; rotate secrets quarterly
- Pin vendor IP ranges when available and rate-limit per integration
- Reject unsigned/expired payloads; include replay nonce cache with 15-minute TTL
- End-to-end schema validation and quarantine pipeline for malformed payloads

**Framework Mapping:** SOC2 CC7.2, ISO 27001 A.8.16, NIST SI-10, HIPAA 164.312(c), GDPR Art. 28(3)(c)

**Gap Status:** ⚠️ PARTIAL - Replay protection and quarantine missing

---

### T - Tampering with Data

#### Threat 2.1: SDK Supply-Chain Tampering

**Description:** Malicious dependency or compromised vendor SDK modifies requests/responses.
**Attack Vector:** Dependency confusion or typosquatting during connector builds.
**DREAD Score:**

- Damage: 9
- Reproducibility: 6
- Exploitability: 7
- Affected Users: 8
- Discoverability: 6
- **Total: 7.2 (HIGH)**

**Existing Mitigation:**

- Lockfiles committed; Trivy/Snyk dependency scans in CI

**Required Mitigation:**

- Enforce checksum verification on vendor SDK downloads and artifact attestation
- Add Semgrep/CodeQL rules to block dynamic `require` of unpinned modules
- Maintain allowlist of vendor packages with version pins; ban install from untrusted registries

**Framework Mapping:** SOC2 CC6.3, ISO 27001 A.8.7, NIST SI-7, HIPAA 164.308(a)(5), GDPR Art. 32(1)(d)

**Gap Status:** ⚠️ PARTIAL - Attestation and allowlist policy needed

---

### R - Repudiation

#### Threat 3.1: Unverifiable Vendor Actions

**Description:** Lack of audit trails for outbound and inbound integration actions.
**Attack Vector:** Missing structured logs for API calls and webhook handling.
**DREAD Score:**

- Damage: 7
- Reproducibility: 5
- Exploitability: 5
- Affected Users: 6
- Discoverability: 6
- **Total: 5.8 (MEDIUM)**

**Existing Mitigation:**

- Application logs for connector activity

**Required Mitigation:**

- Structured audit logging with correlation IDs spanning Summit ↔ vendor calls
- Persist webhook verification outcomes and payload hashes
- Forward enriched logs to SIEM with 400/500 rate alerts per integration

**Framework Mapping:** SOC2 CC7.3, ISO 27001 A.8.15, NIST AU-6, HIPAA 164.312(b), GDPR Art. 30

**Gap Status:** ⚠️ PARTIAL - SIEM forwarding and payload hashing pending

---

### I - Information Disclosure

#### Threat 4.1: Over-scoped Vendor Permissions

**Description:** Granting excessive scopes (e.g., read/write instead of read-only) leaks customer data.
**Attack Vector:** Misconfigured connector scopes or default vendor app permissions.
**DREAD Score:**

- Damage: 9
- Reproducibility: 7
- Exploitability: 6
- Affected Users: 9
- Discoverability: 7
- **Total: 7.6 (HIGH)**

**Existing Mitigation:**

- Manual review of requested scopes

**Required Mitigation:**

- Enforce least-privilege templates per connector; block deployments with unapproved scopes via CI policy checks
- Add runtime data access telemetry by field/table to detect overreach
- Redact PII/PHI fields before outbound sync when not required for use case

**Framework Mapping:** SOC2 CC6.1/CC6.8, ISO 27001 A.5.34, NIST AC-2, HIPAA 164.308(a)(4), GDPR Art. 25/32

**Gap Status:** 🔴 GAP - Automated enforcement missing

---

### D - Denial of Service

#### Threat 5.1: Webhook Flood or Retry Storm

**Description:** Malicious or misbehaving vendors flood webhook endpoints causing queue exhaustion.
**Attack Vector:** Retry storms or intentional abuse of webhook endpoints.
**DREAD Score:**

- Damage: 7
- Reproducibility: 8
- Exploitability: 6
- Affected Users: 7
- Discoverability: 6
- **Total: 6.8 (HIGH)**

**Existing Mitigation:**

- Basic rate limits on ingress

**Required Mitigation:**

- Implement per-integration rate limits with circuit breakers and backoff policies
- Queue depth alerts and autoscaling policies for webhook workers
- Vendor SLA thresholds with automatic disable on threshold breach

**Framework Mapping:** SOC2 CC7.1, ISO 27001 A.5.30, NIST SC-5, HIPAA 164.308(a)(1), GDPR Art. 32(1)(b)

**Gap Status:** ⚠️ PARTIAL - Circuit breakers and auto-disable not yet implemented

---

### E - Elevation of Privilege

#### Threat 6.1: Connector Escalation via Misconfigured Secrets

**Description:** Shared integration secrets across tenants enable cross-tenant escalation.
**Attack Vector:** Single credential used for multiple customers or environments.
**DREAD Score:**

- Damage: 9
- Reproducibility: 5
- Exploitability: 6
- Affected Users: 9
- Discoverability: 6
- **Total: 7.0 (HIGH)**

**Existing Mitigation:**

- Secrets stored centrally

**Required Mitigation:**

- Tenant-scoped credentials with automated rotation and blast-radius constraints
- Runtime policy check to block credential reuse across tenants/environments
- Secrets linting in CI to prevent `.env` or manifest commits with shared tokens

**Framework Mapping:** SOC2 CC6.2, ISO 27001 A.8.32, NIST IA-5, HIPAA 164.312(d), GDPR Art. 25

**Gap Status:** 🔴 GAP - Enforcement and linting missing

---

## Remediation Plan

- **Priority 0:** Enforce webhook signing + replay defense; implement PKCE/state and revoke unscoped tokens.
- **Priority 1:** Add connector least-privilege templates and CI policy tests to block over-scoped permissions.
- **Priority 2:** Establish SIEM pipelines for integration audits; include payload hashing and correlation IDs.
- **Priority 3:** Deploy circuit breakers for webhook workers and tenant-scoped credential enforcement.
- **Validation:** Link remediation evidence to `COMPLIANCE_EVIDENCE_INDEX.md` and update `MITIGATION-MAPPING.md` once implemented.
