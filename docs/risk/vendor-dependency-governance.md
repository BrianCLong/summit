# Vendor & Dependency Governance v0

## Purpose

Establish a unified control plane for all third-party SaaS, infrastructure providers, external APIs, and open-source libraries used by CompanyOS. The goal is zero surprise dependencies: every external component is inventoried, risk-profiled, approved, monitored, and has a defined exit path.

## Dependency Taxonomy

### Categories

- **Infrastructure providers**: cloud platforms, networking, data stores, observability stacks, CI/CD runners.
- **SaaS applications**: support, analytics, collaboration, CRM, marketing, HR, finance, billing, monitoring, and any hosted platform handling CompanyOS or customer data.
- **External APIs**: third-party data feeds, authentication brokers, payment processors, threat intel, or enrichment sources accessed via HTTP/gRPC.
- **Open-source software (OSS) libraries**: runtime dependencies, transitive packages, container base images, CLI tools, and vendored code.

### Risk tiers (by business impact and blast radius)

- **Tier 1 – Critical**: downtime or compromise stops revenue or core product (auth, payments, infra backbone, single-sign-on, core data stores). RTO < 2h, RPO < 1h.
- **Tier 2 – High**: significant productivity or customer-experience degradation (analytics, observability, non-core queues). RTO < 8h, RPO < 4h.
- **Tier 3 – Standard**: localized impact or internal-only tools. RTO < 24h, RPO < 12h.
- **Tier 4 – Low/experimental**: reversible pilots or non-production utilities. RTO < 72h, RPO < 24h.

### Data sensitivity exposure (mark per dependency)

- **P0**: Production customer data (PII/PHI/PCI) or credentials/secrets.
- **P1**: Internal business data (financials, HR, strategy, telemetry with user IDs).
- **P2**: Low-sensitivity operational data (aggregated metrics, anonymized logs).
- **P3**: Public/non-sensitive data.

### Ownership & review cadence

| Item            | Owner                           | Register                  | Review cadence                                     |
| --------------- | ------------------------------- | ------------------------- | -------------------------------------------------- |
| Infra providers | Platform Eng + Security         | Service catalog + CMDB    | Quarterly; post-incident                           |
| SaaS tools      | Business owner + Security       | SaaS registry             | Semi-annual; license/usage true-up                 |
| External APIs   | Integrating team + Security     | API register              | Quarterly; schema/token rotation                   |
| OSS libraries   | Eng team owning code + Security | SBOM + dependency tracker | Monthly for critical repos; per-release for others |

## Onboarding & Approval Flows

### Intake and triage

1. **Request**: submit in intake form/ticket with business justification, data processed, tenant scope, regions, SLA needs, and owner.
2. **Classification**: categorize (Infra/SaaS/API/OSS), assign risk tier, data sensitivity (P0–P3), and intended environment (prod/non-prod).
3. **Initial gating**: block if no business owner, no data minimization plan, or conflicts with existing approved tools.

### Required checks (performed based on tier/sensitivity)

- **Security**: SOC 2/ISO 27001 attestation, pen-test summary, vulnerability history, auth model (SSO/SAML/OIDC), RBAC/SCIM, logging/audit availability, encryption at rest/in transit, key custody/BYOK/HSM if P0.
- **Compliance & privacy**: data processing agreement, DP addendum, subprocessor list, GDPR/CCPA alignment, data residency/region controls, retention/deletion SLAs, breach notification terms, AI/ML usage of customer data.
- **Data flow**: diagram of what data leaves CompanyOS; token scopes; least-privilege access; no production secrets in vendor logs.
- **Financial & resiliency**: pricing model, lock-in risks, uptime SLA, support plan, rate limits, throttling behavior, backup/DR posture, termination rights, escrow for critical vendors.
- **Architecture**: integration pattern (event/webhook/polling/SDK), network ingress/egress needs, egress domains allowlist, dependency on other vendors.

### Approval workflow by dependency type

- **SaaS**: Business owner + Security review → Privacy/DPO sign-off for P0/P1 → Procurement for contracts → Final approval by VP Eng/CISO for Tier 1/2.
- **Infra**: Platform Eng due diligence + Security architecture review → FinOps approval for cost → Exec sign-off for Tier 1.
- **External API**: Integrating team security review (token scopes, rate limits) + Privacy for P0/P1 data → Legal if terms include data sharing → Security sign-off.
- **OSS library**: Security scan (SCA, license, known CVEs), license compatibility check, maintenance signal (release cadence, commit health), SBOM update. High-risk licenses (AGPL/SSPL/GPL) require legal review.

### Registration & tagging

- Record in **central dependency register** with: owner, category, tier, sensitivity, data flow, environments, auth method, approved scopes, SLA, contract dates, renewal reminders, exit plan, and monitoring hooks.
- Tag code repositories with dependency labels; annotate Terraform/Kubernetes manifests with vendor IDs; maintain SBOMs per service.
- Store security artifacts (DPAs, pen test, SOC 2) in the governance vault linked to the register entry.

## Monitoring & Exit Strategies

- **Health & SLA monitoring**: uptime/SLA dashboards for Tier 1/2; synthetic checks for critical APIs; quota/rate-limit monitors; webhook latency/error SLIs; budget and usage alerts.
- **Credential hygiene**: rotate API keys quarterly (Tier 1/2) or semi-annually (Tier 3/4); enforce SSO/SCIM for SaaS; track token scopes in register.
- **Vulnerability watching**: subscribe to vendor status feeds, CVE advisories for SDKs, OSS release notes; enable Dependabot/Snyk for code.
- **Incident handling**:
  - Trigger playbook when vendor reports breach/degradation.
  - Contain: revoke tokens/rotate creds, disable integrations, enable circuit breakers/feature flags.
  - Communicate: inform Security/Legal/Comms; notify customers if required by DPA.
  - Recover: fail over to secondary vendor or degraded mode; validate data integrity; re-enable after joint RCA.
- **Exit plans**:
  - For each Tier 1/2 dependency maintain replacement options, data export formats, and migration steps.
  - Keep contract termination rights, notice periods, and data deletion commitments documented.
  - Maintain configuration-as-code to swap endpoints/credentials and feature flags to disable vendor-specific paths.

## Artifacts

### Vendor & Dependency Governance v0 Outline

1. Purpose & scope
2. Taxonomy (categories, tiers, data sensitivity)
3. Roles & ownership
4. Onboarding & approval workflows
5. Registration & tagging standards
6. Monitoring (SLA, security, spend)
7. Incident response & escalation
8. Exit/contingency planning
9. Audit & review cadence

### Onboarding checklists

**New SaaS tool**

- [ ] Business case, owner, environments, data classification (P0–P3), tier assignment
- [ ] SSO/SAML + SCIM availability; RBAC model validated
- [ ] Security attestations (SOC 2/ISO), pen-test summary, breach history
- [ ] Data residency/retention controls; subprocessor list; DPA executed
- [ ] Logging/audit export; admin access least privilege; MFA enforced
- [ ] SLA/uptime, support plan, rate limits, throttling behavior
- [ ] Financial terms reviewed; renewal/termination clauses captured
- [ ] Integration pattern approved; egress domains allowlisted; webhook/IP allowlists configured
- [ ] Monitoring and alerts configured; runbook linked; exit plan documented
- [ ] Registered in SaaS catalog with artifacts attached

**New OSS library**

- [ ] License approved (reject AGPL/SSPL without legal review); compatibility verified
- [ ] Popularity/maintenance signal (stars/downloads, releases in last 12 months)
- [ ] Security scan (CVEs, SCA); verify supply-chain hygiene (signed releases if available)
- [ ] Version pinning strategy; update cadence defined; transitive deps reviewed
- [ ] Performance/compatibility tested in staging; sandboxed if handling untrusted input
- [ ] SBOM updated; dependency tagged in repo; OWNERS file updated
- [ ] Monitoring configured for CVE advisories/Dependabot; rollback plan identified

### “Dependency is allowed in CompanyOS if…” checklist

- [ ] Categorized (Infra/SaaS/API/OSS), risk tiered, and data sensitivity labeled
- [ ] Business/technical owner assigned with review cadence agreed
- [ ] Security, privacy, and compliance checks completed for its tier/sensitivity
- [ ] Financial terms, SLAs, and termination clauses recorded; renewal reminders set
- [ ] Integration follows least-privilege access with documented data flows and logs
- [ ] Registered in the central dependency register with monitoring hooks
- [ ] Incident playbook and exit plan exist (fallback vendor or degraded mode)
- [ ] SBOM/catalog updated; code/config tagged with dependency identifier
- [ ] Credentials managed with rotation schedule; SSO/SCIM enabled where applicable

## Operating Model

- **Governance board**: Security (chair), Platform Eng, FinOps, Legal/Privacy, and business owner meet monthly to review new requests and quarterly to re-certify Tier 1/2 vendors.
- **Evidence**: All approvals, contracts, and test results stored in governance vault; references linked in the register.
- **Auditability**: Quarterly sample audit of 10% of dependencies; annual full inventory reconciliation against SBOMs, Terraform state, and spend reports.
- **Continuous improvement**: Post-incident RCAs feed back into checklists; automate gating in CI (license allowlist, SBOM diff) and procurement workflows.
