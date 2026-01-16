# Summit Control Mapping Packet: Runtime Governance

### A) Control Map Table (Core Set)

| Framework | Control ID | Control Intent | Summit Implementation | Evidence Artifacts | Verification | Gaps / Follow-ups |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SOC2** | **CC6.1** | Logical access to data is restricted to authorized tenants. | • `TenantIsolationGuard` enforces boundary checks.<br>• `tenantContextMiddleware` resolves identity.<br>• Cross-tenant requests return 403. | • `artifacts/ga/ga_snapshot.json` (Config)<br>• `ci/opa-decisions` (Logs) | Job: `unit-tests`<br>File: `server/tests/tenant-isolation.test.ts` | Formalize `GovernanceVerdict` schema in `packages/core`. |
| **NIST** | **AC-3** | Enforcement of approved authorizations for logical access. | • `TenantPolicyDecision` object dictates runtime allowance.<br>• `enforceRateLimit` & `enforceStorageQuota` check usage. | • `server/src/tenancy/types.ts` (Policy Logic)<br>• `ci/test-reports` | Job: `unit-tests`<br>CMD: `pnpm test:unit` | - |
| **ISO** | **A.9.4.1** | Access to information and application system functions. | • Middleware enforces strict tenant context.<br>• Rate limits prevent resource exhaustion (DoS protection). | • `server/src/tenancy/TenantIsolationGuard.ts` | Job: `unit-tests` | - |
| **SOC2** | **CC7.3** | Incident response allows emergency override or shutdown. | • `TenantKillSwitch` (file-based) allows per-tenant lockout.<br>• `safetyModeMiddleware` provides Global Kill Switch. | • `config/tenant-killswitch.json` (Runtime)<br>• `server/src/tenancy/killSwitch.ts` | Job: `unit-tests` | - |
| **NIST** | **IR-4** | Incident handling capabilities (emergency cutoff). | • Global Kill Switch blocks all mutating methods (POST/PUT/DELETE).<br>• "Safe Mode" blocks high-risk paths (`/api/ai`, `/api/webhooks`). | • Logs: `Request blocked by global kill switch`<br>• Logs: `Request blocked by safe mode` | Job: `unit-tests` | - |
| **SOC2** | **CC5.2** | System inputs are complete and accurate (Audit Logging). | • `TenantIsolationGuard` logs decision reasoning via Pino.<br>• Decisions include `allowed`, `status`, `reason`. | • `server/src/tenancy/types.ts` (Decision Type) | Job: `unit-tests` | Ensure logs are shipped to SIEM (currently Pino stdout). |
| **NIST** | **AU-2** | Audit events generation. | • All `TenantPolicyDecision` denials are logged as warnings.<br>• Rate limit breaches logged with tenant/tier context. | • `ci/opa-decisions` (Simulated) | Job: `unit-tests` | - |
| **SOC2** | **CC8.1** | Changes are tested and authorized before deployment. | • `ga-gate.sh` enforces comprehensive readiness (Smoke, Security, Lint).<br>• `generate_evidence.ts` bundles control artifacts. | • `artifacts/ga/ga_report.json`<br>• `artifacts/ga/ga_snapshot.json` | Job: `ga-gate`<br>CMD: `make ga` | - |
| **NIST** | **SI-7** | Software, firmware, and information integrity. | • `scripts/compliance/generate_evidence.ts` captures file snapshots.<br>• `control-map.yaml` defines integrity targets. | • `auditor-bundle-${timestamp}/manifest.json` | Job: `ga-gate` | - |
| **SOC2** | **CC1.2** | Personnel changes/coding authorized. | • Branch protection checks via `governance-check.yml`.<br>• PR classification (major/minor/patch) enforcement. | • `artifacts/governance/pr-classification` | Job: `governance-check` | - |

### B) Evidence Index Addendum

Add this block to `compliance/evidence-index.yaml` (or equivalent registry):

```yaml
evidence_index:
  - id: runtime_governance_boot_snapshot
    path: artifacts/ga/ga_snapshot.json
    verifier: json
    required_fields:
      - timestamp
      - commit_sha
      - environment

  - id: runtime_governance_report
    path: artifacts/ga/ga_report.json
    verifier: json
    required_fields:
      - checks
      - total_duration_seconds
      - status

  - id: tenant_isolation_tests
    path: server/tests/tenant-isolation.test.ts
    verifier: exists
    description: "Verification of cross-tenant leakage protection"

  - id: kill_switch_implementation
    path: server/src/tenancy/killSwitch.ts
    verifier: sha256
    description: "Source code for emergency tenant lockout"

  - id: governance_verdict_logic
    path: server/src/tenancy/types.ts
    verifier: sha256
    description: "Type definition for TenantPolicyDecision (Authorization Verdict)"

  - id: control_map_definition
    path: compliance/control-map.yaml
    verifier: exists
    description: "Mapping of regulatory controls to Summit artifacts"
```

### C) Auditor Narrative

**Summit Runtime Governance & Isolation**

Summit enforces Multi-Tenant Isolation through a rigorous "Guard" pattern implemented in `TenantIsolationGuard.ts`. Every request is intercepted by `tenantContextMiddleware`, which resolves identity from JWTs, headers, or route parameters, ensuring consistency across all three. The Guard then evaluates a `TenantPolicyDecision`, enforcing:
1.  **Isolation:** Cross-tenant resource access is strictly denied (HTTP 403).
2.  **Resource Control:** Usage is checked against tiered rate limits and storage quotas.
3.  **Emergency Control:** A file-based `TenantKillSwitch` allows operators to instantly lock out specific tenants without redeploying, while a Global Kill Switch (in `safetyModeMiddleware`) can block all mutating operations (POST/PUT/DELETE) or high-risk API paths during active incidents.

All governance decisions are logged with structured JSON (Pino), providing a traceable audit trail for SOC 2 CC5.2. Evidence of these controls is automatically generated by the `ga-gate` pipeline, which produces a cryptographically verifiable `ga_snapshot.json` and `ga_report.json` for every release candidate.

### D) Implementation Checklist

To finalize compliance with this packet:

**Code & Governance**
- [ ] **Formalize Verdict:** Migrate `TenantPolicyDecision` (in `types.ts`) to a canonical `GovernanceVerdict` schema in `packages/core/` to satisfy the architectural intent.
- [ ] **Log Shipping:** Ensure `TenantIsolationGuard` logs are configured for export (currently standard out) to satisfy NIST AU-2 retention requirements.
- [ ] **Policy Pack:** Create `docs/governance/GOVERNANCE_POLICY_PACK.yml` if missing, or link `compliance/control-map.yaml` as the single source of truth.

**Testing & Verification**
- [ ] **Gap Fill:** Ensure `server/tests/safety/` exists and covers `safetyModeMiddleware` (Global Kill Switch) explicitly.
- [ ] **Snapshot CI:** Update `.github/workflows/ga-gate.yml` to publish `artifacts/ga` as a release asset for permanent evidence retention.

**Documentation**
- [ ] **Publish:** Commit this packet to `docs/governance/runtime_control_map.md`.
- [ ] **Update Map:** Add the new Evidence IDs from Section B to `compliance/control-map.yaml`.
