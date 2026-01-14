# Unified Governance Gate

The Unified Governance Gate is the single source of truth for repository governance. It executes a collection of "gates" (policy checks) defined in a policy pack, aggregates their results, and produces a consolidated evidence bundle.

## Usage

### Run Locally

```bash
pnpm ci:governance --mode <pr|main|nightly> --sha <git-sha>
```

- **--mode**: The execution context.
  - `pr`: Runs checks relevant for Pull Requests (faster, fewer gates).
  - `main`: Runs checks for merge to main branch (stricter).
  - `nightly`: Runs comprehensive checks including long-running tests.
- **--sha**: The git SHA being verified. Defaults to HEAD.

### CI Integration

The gate runs automatically in the `Governance / Unified Gate` CI job.

## Policy Pack

The policy is defined in `docs/governance/GOVERNANCE_POLICY_PACK.yml`.

Example structure:
```yaml
schema_version: "1"
required_job_name: "Governance / Unified Gate"
gates:
  - id: "evidence_bundle"
    required: true
    command: "pnpm ci:evidence:bundle"
```

## Outputs

Artifacts are stored in `artifacts/governance/unified/<sha>/`:

- **report.json**: Canonical JSON report of all gate executions.
- **report.md**: Human-readable summary.
- **stamp.json**: Cryptographic stamp of the run, including policy hash.
- **index.json**: Links to individual gate artifacts.

## Adding a New Gate

1. Add the gate command to `package.json` (e.g., `ci:my-gate`).
2. Update `docs/governance/GOVERNANCE_POLICY_PACK.yml`:
   ```yaml
   - id: "my_gate"
     required: true
     command: "pnpm ci:my-gate"
     outputs:
       report: "path/to/my/report.json"
   ```
3. Ensure your gate respects output path environment variables if necessary (e.g., `EVIDENCE_OUTPUT_DIR` is set by the runner).
