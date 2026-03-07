# Summit Launch Scope & Freeze Rules

## Launch Scope

### Included SKUs

- **Summit Core**: Full access to the Summit platform (SaaS).
- **Summit Enterprise**: Core + SSO, Audit Logs, Dedicated Support.

### Enabled Regions

- **US-East (N. Virginia)**: Primary launch region.
- **EU-West (Ireland)**: Secondary region (Data Residency compliant).

### Supported Workloads

- **Graph Analytics**: Up to 1M nodes/edges per tenant.
- **Maestro Workflows**: Up to 100 concurrent runs.
- **PsyOps Defense**: Standard threat detection pipelines.

### Explicit Exclusions (Not Supported at Launch)

- **On-Premise Deployment**: Not supported in V1.
- **Custom LLM Fine-tuning**: Beta only, not general availability.
- **Legacy API Adapters**: Deprecated.
- **Real-time Video Processing**: Out of scope.

## Freeze Rules

### Frozen Artifacts

The following critical paths are **FROZEN**. Changes require Executive Approval (approver: `exec-team`).

- `server/src/lib/resources/` (Quota & Billing Logic)
- `server/src/pii/` (Privacy & Compliance)
- `server/src/auth/` (Authentication & Security)
- `LAUNCH_SCOPE.md` (This file)

### Change Policy

- **Bug Fixes**: Allowed with Peer Review + QA Sign-off.
- **Documentation**: Allowed (docs-only).
- **New Features**: **BLOCKED**. No new feature flags or endpoints.
- **Config Changes**: Requires `infra-lead` approval.

### CI Enforcement

CI will fail any PR touching frozen paths without the `launch-override` label or explicit approval in the commit message (e.g., `[launch-override]`).
