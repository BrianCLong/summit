# Evidence Bundle Specification

> **Status**: Experimental
> **Owner**: Jules (Release Captain)

## Definition

An **Evidence Bundle** is a structured artifact that proves a change does what it claims and doesn't break the system. It is the output of the "Verify" step in the ContextOps workflow.

## Location

Evidence Bundles must be committed to the repository in the `evidence/` directory.
Naming convention: `evidence/<feature-slug>/` or `evidence/<YYYY-MM-DD-short-desc>/`.

## Contents (v1)

A valid Evidence Bundle must contain the following:

### 1. `claims.yml`
Declarative statements about the change.
```yaml
changes:
  - "Added ContextOps documentation"
behavior:
  - "User can read docs/contextops.md"
```

### 2. `checks.yml`
The commands executed to verify the claims.
```yaml
checks:
  - command: "npm test"
    output_contains: "PASS"
  - command: "ls -la docs/"
    output_contains: "contextops.md"
```

### 3. `risk.json`
Automated or manual risk assessment.
```json
{
  "touched_areas": ["docs"],
  "risk_level": "low",
  "policy_flags": []
}
```

### 4. `repro.md`
Human-readable reproduction steps.
```markdown
1. Checkout branch
2. Run `cat docs/contextops.md`
3. Verify content matches spec.
```

### 5. `artifacts/` (Directory)
Raw evidence files.
- `logs/`: Build logs, test logs.
- `snapshots/`: Screenshots, DOM dumps.
- `diffs/`: `git diff --stat`.

## Policy Enforcement

1.  **Gate**: All PRs labeled `agentic-change` MUST have a corresponding Evidence Bundle.
2.  **Verification**: A CI check will fail if the bundle is missing.
3.  **Trust-Then-Verify**: Critical changes require a secondary agent or human to re-run the `checks.yml` and sign off.
