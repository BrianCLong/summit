# Control Framework Mapping

This mapping aligns Summit's internal controls with SOC 2, ISO 27001-style clauses, and AI governance expectations. Each control lists the enforcement mechanism and evidence generated automatically by CI or runtime systems.

## Control Catalog

### Governance and Change Management

- **CM-1: Deterministic change control**
  - **SOC 2**: CC1.1, CC8.1
  - **ISO-style**: A.12.1, A.14.2
  - **AI governance**: Model and data lineage must be captured.
  - **Objective**: Ensure code, model, and data changes follow authenticated, reviewable workflows.
  - **Enforcement**: CI policy gates (`.github/workflows/pr-quality-gate.yml`), CODEOWNERS, immutable provenance ledger.
  - **Evidence**: CI gate results, provenance ledger entries, signed attestations.
  - **Frequency**: Per commit/PR.
  - **Owner**: CI governance engine.

- **CM-2: Protected branches and release criteria**
  - **SOC 2**: CC5.2, CC7.2
  - **ISO-style**: A.12.5, A.14.2.8
  - **AI governance**: Release-only from validated model artifacts.
  - **Objective**: Prevent unreviewed or unvalidated releases.
  - **Enforcement**: Protected branches, release workflows, registry provenance validation.
  - **Evidence**: Release pipeline logs, artifact signatures, SBOMs.
  - **Frequency**: Every release.
  - **Owner**: Release automation.

### Security and Integrity

- **SI-1: Identity-bound changes**
  - **SOC 2**: CC6.1, CC6.3
  - **ISO-style**: A.9.4
  - **AI governance**: Human-attributed approvals for agent actions.
  - **Objective**: Ensure only authenticated, authorized identities modify controlled assets.
  - **Enforcement**: CODEOWNERS, signed commits, provenance ledger enforcement.
  - **Evidence**: Git signatures, provenance events, access logs.
  - **Frequency**: Per commit.
  - **Owner**: Access control service.

- **SI-2: Supply chain integrity**
  - **SOC 2**: CC1.4, CC7.4
  - **ISO-style**: A.12.6, A.14.2.4
  - **AI governance**: Model artifact integrity and dataset fingerprints.
  - **Objective**: Detect tampering and ensure provenance across dependencies.
  - **Enforcement**: SBOM checks, signature verification, dependency policy enforcement.
  - **Evidence**: SBOMs, signature verification logs, dependency scan reports.
  - **Frequency**: Nightly and on change.
  - **Owner**: CI security scanner.

### Availability and Resilience

- **AV-1: Service SLO adherence**
  - **SOC 2**: A1.2
  - **ISO-style**: A.17.1
  - **AI governance**: Degradation detection for AI quality.
  - **Objective**: Maintain observability and SLO enforcement for critical services.
  - **Enforcement**: SLO monitors, alert policies, synthetic checks.
  - **Evidence**: SLO burn alerts, synthetic test logs, incident retrospectives.
  - **Frequency**: Continuous.
  - **Owner**: Observability stack.

### Data and AI Governance

- **DG-1: Data residency and handling**
  - **SOC 2**: CC1.4, CC8.2
  - **ISO-style**: A.8, A.18
  - **AI governance**: Dataset lineage and use restrictions.
  - **Objective**: Enforce data classification, retention, and locality.
  - **Enforcement**: Data handling policies, retention jobs, access controls.
  - **Evidence**: Data retention logs, access reviews, dataset fingerprints.
  - **Frequency**: Daily retention jobs and quarterly reviews.
  - **Owner**: Data governance service.

- **AI-1: Model provenance and output guardrails**
  - **SOC 2**: CC7.2, CC7.3
  - **ISO-style**: A.14.2.5, A.18.1
  - **AI governance**: Model version lineage, output filtering, harm detection.
  - **Objective**: Provide traceability for every AI output and enforce guardrails.
  - **Enforcement**: Provenance ledger, output scanners, policy engine (OPA).
  - **Evidence**: Ledger records, scanner reports, policy decision logs.
  - **Frequency**: Per inference/output.
  - **Owner**: AI governance runtime.

### Exception and Risk Management

- **EX-1: Time-bounded exceptions**
  - **SOC 2**: CC4.1, CC5.3
  - **ISO-style**: A.12.1.2, A.18.2
  - **AI governance**: Explicit risk acceptance with model-safety rationale.
  - **Objective**: Allow controlled exceptions with auto-expiry and review.
  - **Enforcement**: `audit/exceptions.yaml` plus CI expiry check.
  - **Evidence**: Exception records, CI check history, approval links.
  - **Frequency**: On every CI run.
  - **Owner**: CI governance engine.

- **DE-1: Technical debt observability**
  - **SOC 2**: CC4.2
  - **ISO-style**: A.18.2.3
  - **AI governance**: Bias and drift debt tracked as first-class risk.
  - **Objective**: Track monotonic reduction of debt (security, reliability, bias).
  - **Enforcement**: Debt score pipeline, automated reports.
  - **Evidence**: Debt trend reports, remediation tasks, CI deltas.
  - **Frequency**: Weekly and per change.
  - **Owner**: Metrics pipeline.

## Evidence References

- Machine-readable map: [`audit/control-map.yaml`](../../audit/control-map.yaml)
- Evidence registry: [`audit/evidence-registry.yaml`](../../audit/evidence-registry.yaml)
- Exceptions: [`audit/exceptions.yaml`](../../audit/exceptions.yaml)
