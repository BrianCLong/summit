# Summit Governance-as-Code

Summit encodes governance as code: versioned, testable, and enforced by CI.

## Components

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
- `summit.shared` – shared helpers

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
