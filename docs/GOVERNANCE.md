# Summit Governance-as-Code

Summit encodes governance as code: versioned, testable, and enforced by CI.

## Components

### Portfolio & Focus (Sprint N+55)

To maintain focus and high value density, all new additions must adhere to the **Pruning & Focus** protocols.

**1. ROI Rationale Requirement**
Every new feature, integration, or experimental module PR must include an "ROI Rationale" section in the PR description, answering:
- **Why Now?** (Urgency/Timeliness)
- **Who pays/benefits?** (Customer value)
- **What is the maintenance cost?**
- **What happens if we don't do it?**

**2. Focus Guardrails**
- **Zero-Sum Capacity:** If a new large initiative is added, an existing low-ROI item must be nominated for retirement.
- **Experimental Cap:** A maximum of 3 concurrent "Incubation" or "Black Project" tracks are allowed active at any time. Excess experiments must be paused or retired.

### Schemas (`schemas/`)

Schemas define contracts for governance artifacts:

- `purchase-order.schema.json` – financial events
- `sbom.schema.json` – software bill of materials
- `provenance-event.schema.json` – build/deploy provenance
- `policy-decision.schema.json` – policy evaluation snapshots
- `agent-run.schema.json` – multi-agent run records

### Policies (`policy/`)

OPA/Rego packages:

- `summit.deploy` – production deploy gate
- `summit.pr` – PR merge gate
- `summit.sbom` – SBOM quality gate
- `summit.provenance` – provenance invariants
- `summit.access` – access control for governance actions
- `summit.regulatory` – clean-hands regulatory advantage strategy
- `summit.shared` – shared helpers

### Legal & IP

- **IP Register**: `docs/legal/IP_REGISTER.yaml` tracks core assets.
- **Due Diligence**: `docs/legal/IP_PLAYBOOK.md` defines audit and M&A readiness procedures.

### CI Workflow

`.github/workflows/mvp4-gate.yml` runs on PRs and selected branches:

1. Validate schemas and sample documents
2. Run OPA policy tests (Non-blocking, see `docs/ga/waivers/WAIVER-001-POLICY-SYNTAX.md`)
3. Build OPA input from GitHub event (`ci/build-opa-input.js`)
4. Evaluate deploy, PR, and SBOM policies
5. Emit `governance-decision.json` as an artifact

### Audit

`audit/` stores signed, append-only audit events for:

- policy evaluations
- SBOM verification
- deploy execution

### Release Integrity & PR Normalization

We enforce a strict "Golden Path" for all contributions and releases:

1.  **PR Normalization**:
    All PRs must strictly adhere to the `PR_NORMALIZATION_CHECKLIST.md`.
    - **Atomic Commits**: Changes must be scoped to a single feature or fix.
    - **Evidence**: All changes must include evidence artifacts (tests, screenshots).

2.  **Release Gates**:
    - **SBOM**: A Software Bill of Materials (CycloneDX) is generated for every build (`.evidence/sbom.json`).
    - **Signing**: All release artifacts are cryptographically signed.
    - **Vulnerability Gating**: Releases are blocked if critical vulnerabilities are detected.

3.  **SOC 2 Compliance**:
    See `docs/compliance/SOC_MAPPING.md` for a detailed mapping of technical controls to SOC 2 criteria.

### Developer usage

Local checks:

```bash
# JSON Schema
ajv compile -c ajv-formats --spec=draft2020 -s schemas/**/*.json

# OPA tests
opa test policy/ -v
```

CI is the final authority: PRs should not merge unless governance is green.
