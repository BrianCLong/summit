# Pre-Deploy Credential Provisioning — Profiles, Prompts, and Lifecycle Management

This module packages three production-ready prompts and a profile-driven workflow that keeps pre-deploy provisioning aligned with an evolving multi-cloud, multi-SaaS stack.

## 0. Profile Manager (Single Source of Truth)

Maintain the stack definition in `codex_profile.yaml` and treat the file as an authoritative, versioned contract between Platform and Security. Every prompt renders directly from this profile.

```yaml
# codex_profile.yaml (authoritative)
org_name: "{{ORG_NAME|Topicality}}"
env: [prod, staging, dev]
idp: { primary: okta, secondary: entra }
biometrics: { enabled: true, method: webauthn_passkeys, device_binding: platform_and_roaming }
key_management:
  vault: hashicorp_vault   # options: cloud_kms_only | hybrid | external
  kms:
    - provider: aws_kms
      key_purpose: [envelope, code_signing]
    - provider: gcp_kms
      key_purpose: [envelope]
    - provider: azure_key_vault
      key_purpose: [envelope]
  policy: deny_long_lived_static_keys: true
clouds:
  aws: { org_management_account: "111111111111", regions: [us-east-1, us-west-2] }
  azure: { tenants: ["contoso.onmicrosoft.com"], subscriptions: ["Prod-01","Dev-01"] }
  gcp: { org_id: "1234567890", folders: ["prod","dev"] }
saas:
  scm: { github: { orgs: ["your-org"], use_oidc: true, fine_grained_tokens: true } }
  ci: { gha: true, circleci: false }
  telemetry: { datadog: true, newrelic: false, opentelemetry: true }
  data: { snowflake: true }
  chat: { slack: true, teams: false }
subscriptions_and_accounts:
  policy: enforce_sane_defaults: true
  naming: "{env}-{app}-{component}"
connections_catalog:
  - name: snowflake_primary
    type: jdbc
    target: snowflake
    auth: key_pair
    owner: data_platform
    rotation_days: 30
  - name: github_app_codex
    type: oauth_app
    target: github
    auth: app_private_key
    rotation_days: 90
risk:
  require_dual_approval_for: [break_glass, policy_widening]
  bootstrap_ttl_minutes: 120
compliance:
  sbom: true
  slsa: provenance_v1
  disclosure_pack: true
```

**Workflow**

- Store the profile in a private repository.
- Use CI to render the active prompt(s) into runbooks and CLI help text.
- Require PR approvals from Platform and Security; attach Maestro run IDs on merge.

## 1. Tailored Prompt — Your Stack

### Objective

Implement a one-time pre-deploy provisioning step (CLI plus optional UI) that onboards the full stack for `{{org_name}}`, then hands off to just-in-time, least-privilege operations powered by OIDC and federated workload identities.

### Scope

- **Clouds**: `{{clouds}}`
- **SaaS**: `{{saas}}`
- **IdP**: `{{idp.primary}}` (fallback `{{idp.secondary}}`)
- **Key Management**: `{{key_management.vault}}` with KMS set `{{key_management.kms}}`
- **Connections Catalog**: `{{connections_catalog}}`
- **Subscriptions/Accounts Policy**: `{{subscriptions_and_accounts.policy}}`

### Non-Negotiable Outcomes

1. Bootstrap principals carry a TTL of `{{risk.bootstrap_ttl_minutes}}` minutes and are auto-revoked after setup.
2. Zero standing secrets: all operations move to OIDC/JIT; any residual keys are envelope-encrypted under customer KMS.
3. Sensitive actions require WebAuthn/passkey step-up with device binding (`{{biometrics.method}}`, `{{biometrics.device_binding}}`).
4. Provisioning emits provenance artifacts: IntelGraph claims, Maestro run IDs, SBOM, SLSA provenance, and disclosure packs.

### Flow

1. **Discovery** – Enumerate clouds (AWS, Azure, GCP) and SaaS targets (GitHub, Slack, Snowflake, Datadog).
2. **Dry-Run Plan** – Present resource diffs, IAM deltas, blast-radius simulations, and rollback options.
3. **Scoped Bootstrap** – Create setup-only principals and wire OIDC trust from Codex workloads.
4. **Provision Operational Roles** – Apply cross-platform role templates (inventory-reader, rotation-operator, cost-reader) per provider.
5. **Register Connections** – Instantiate each catalog entry with owner, rotation window, and secret-broker binding.
6. **Close-Out** – Revoke bootstrap roles, export evidence, create IntelGraph nodes, and schedule rotation jobs.

### Security & Compliance Guardrails

- OPA ABAC policies with default deny, reason-for-access prompts, and dual approval for `{{risk.require_dual_approval_for}}`.
- DLP redaction, tamper-evident (hash-chained) logs, customer-managed KMS keys.
- Secret scanning and supply-chain attestations (SBOM, OSV/Trivy, SLSA provenance) for the provisioning tool itself.

### Differentiators to Ship

- **Auto-Minimization Engine** – Learns real usage and shrinks roles after canaries.
- **DriftGuard** – Detects shadow admins, stale keys, orphaned apps, and opens remediation PRs.
- **Transparency Ledger** – Optional public hash registry of policies and run metadata.

### Definition of Done

- Successful end-to-end provisioning across all declared clouds plus GitHub.
- OIDC JIT verifies that no static secrets remain.
- Bootstrap roles auto-revoke and first rotation executes.
- Evidence pack generated; IntelGraph and Maestro entries present; DriftGuard flags a simulated out-of-band grant.

## 2. Comprehensive Generic Prompt

A multi-provider, opinionated prompt for onboarding major clouds (AWS, Azure, GCP, OCI) and top SaaS/dev platforms with least-privilege roles, OIDC/JIT trust, and lifecycle governance.

**Highlights**

- Workload identity federation everywhere—no personal access tokens when OIDC or fine-grained tokens exist.
- Cross-platform role templates with blast-radius simulation and permission minimization.
- Central connections catalog with owners, rotation SLAs, and runbooks.
- WebAuthn/passkey step-up for bootstrap apply, policy widening, break-glass, and production rotations.
- Disclosure Pack + SBOM/SLSA + IntelGraph provenance for every grant.
- Idempotent apply/rollback with states: Not Started → Planned → Applied → Rolled Back → Needs Attention.

**Starter Integrations**

Clouds (AWS, Azure, GCP, OCI), SCM/CI (GitHub, GitLab, Bitbucket, GitHub Actions, Jenkins, CircleCI), Observability (Datadog, New Relic, Splunk, CloudWatch, Azure Monitor, GCP Ops), Data (Snowflake, BigQuery, Redshift, Databricks), Messaging (Slack, Teams), ITSM/Paging (Jira, ServiceNow, PagerDuty), IdPs (Okta, Entra, Ping), and Vaults/KMS (HashiCorp Vault, AWS KMS, Azure Key Vault, GCP KMS).

Deliverables include a `codex predeploy` CLI/UI, policy packs, role templates, evidence generators, DriftGuard, Auto-Minimization, and integration tests.

## 3. Platform-Agnostic Minimal Prompt

A foundational prompt that produces only identity federation trust, least-privilege operational roles, connection registry entries, and provenance artifacts—deferring provider-specific choices.

**Controls**

- No static secrets stored; temporary secrets wrapped by customer KMS.
- WebAuthn step-up required for all sensitive actions; logs redacted before persistence.
- Every change emits a signed policy diff and Maestro run ID.

Output is a portable bundle of policies, trust manifests, rotation schedules, and a disclosure pack.

## 4. Subscriptions, Keys, and Connections Lifecycle

- **Subscriptions/Accounts** – Enforce naming policy, attach landing zones/SCPs, register ownership and environments, monitor for privilege drift.
- **Keys/Secrets** – Track purpose, owner, SLA, and last use; rotate through OIDC-assumed operators with before/after proofs; deprecate unused secrets and quarantine suspected exposures.
- **Connections** – Model connection types (JDBC, OAuth App, API Token, SSH CA, TLS cert) with health checks and renewal jobs; raise tickets and remediation PRs on drift/failure.

## 5. Biometricization Plan

**Current** – Require WebAuthn/passkeys (platform + roaming authenticators with device binding) for bootstrap approvals, policy widening, break-glass, and production rotations. Integrate with Okta/Entra IdPs and capture IntelGraph reason-for-access records.

**Future Enhancements**

- Continuous session assurance via device posture signals (hardware security elements, OS integrity) without collecting PII.
- Biometric escrow for break-glass with dual-party unlock, time-lock, and enhanced logging.
- Transaction signing where users sign policy hashes; signatures stored alongside run artifacts.

## 6. Implementation Contracts

- Maestro plan → run → artifact lifecycle with budget controls and freeze windows.
- IntelGraph Decision nodes for every grant/change, capturing owners, risks, reversibility, and guardrail checks.
- Declarative configuration (YAML/TOML) with schema validation, signature enforcement, and an SDK for adding providers.

## 7. Two-Week Demo Slice

1. Run `codex predeploy init` for AWS + GitHub using the profile; show plan → WebAuthn approval → apply.
2. Execute a managed key rotation with only OIDC-assumed roles (no static keys).
3. Produce evidence: Disclosure Pack, IntelGraph entries, Maestro run.
4. Simulate drift and have DriftGuard open a least-privilege remediation PR.
