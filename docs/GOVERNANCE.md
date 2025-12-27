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

`.github/workflows/governance.yml` runs on PRs and selected branches:

1. Validate schemas and sample documents
2. Run OPA policy tests
3. Build OPA input from GitHub event (`ci/build-opa-input.js`)
4. Evaluate deploy, PR, and SBOM policies
5. Emit `governance-decision.json` as an artifact

### Audit

`audit/` stores signed, append-only audit events for:

- policy evaluations
- SBOM verification
- deploy execution

### Developer usage

Local checks:

```bash
# JSON Schema
ajv compile -c ajv-formats --spec=draft2020 -s schemas/**/*.json

# OPA tests
opa test policy/ -v
```

CI is the final authority: PRs should not merge unless governance is green.
