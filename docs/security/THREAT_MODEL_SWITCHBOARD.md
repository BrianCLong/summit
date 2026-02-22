# Switchboard Threat Model

## Scope

Switchboard personal agent and white-label deployments, covering skill execution, receipts, policy enforcement, connectors, and evidence exports.

## MAESTRO Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: supply-chain malware, prompt injection, credential exfiltration, cross-tenant leakage, unsafe autopilot execution, evidence tampering.
- **Mitigations**: signed skills, sandbox probes, deny-by-default policy, scoped tokens, deterministic receipts, redaction-by-default exports, audit logging.

## Threats and Controls

### 1) Malicious Skills / Supply Chain

- **Threat**: Skill bundles introduce malware or hidden exfiltration.
- **Controls**:
  - Signed bundles and digest pinning.
  - Mandatory sandbox probes (network, filesystem, process).
  - Capability linting with explicit allowlists.

### 2) Prompt Injection → Tool Abuse

- **Threat**: Inputs coerce the agent into unsafe tool actions.
- **Controls**:
  - Deny-by-default policy engine.
  - Mode gating: Observe/Assist/Autopilot.
  - Policy explain tree recorded in receipts.

### 3) Credential Exfiltration

- **Threat**: Skills or logs leak sensitive credentials.
- **Controls**:
  - Scoped, just-in-time tokens.
  - Redaction-by-default receipts.
  - Log and receipt filters for secrets.

### 4) Cross-Tenant Leakage

- **Threat**: White-label tenant data crosses boundaries.
- **Controls**:
  - Tenant-scoped storage and export.
  - Negative isolation tests.
  - Admin RBAC-lite with receipts for all actions.

### 5) Autopilot Surprise

- **Threat**: Autopilot performs unsafe actions without consent.
- **Controls**:
  - Workflow approval required for Autopilot.
  - Budget and capability caps enforced.
  - Automatic fallback to Assist on policy denial.

### 6) Evidence Tampering

- **Threat**: Receipts or bundles are altered post-execution.
- **Controls**:
  - Content-addressed receipts with signatures.
  - Deterministic replay verification.
  - Evidence bundle stamps with hashes.

## Residual Risk

Residual risk is limited to approved workflows and declared capabilities. Any deviation triggers policy denial and is recorded in receipts.

## Observability & Monitoring

- Receipt generation rate and failure alerts.
- Policy denial spikes.
- Sandbox probe failures.
- Evidence replay mismatch alerts.

## Response Plan (Security Incidents)

1. Freeze affected skills and revoke signatures.
2. Rotate scoped token issuers.
3. Export evidence bundle for investigation.
4. Publish containment receipts and remediation plan.
