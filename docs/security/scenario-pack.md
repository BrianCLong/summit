# Agent Security Scenario Pack

This pack exercises build-layer safety for the Agent Action Gateway, tool routing, and prompt/policy surfaces. Scenarios are stored in `server/security/scenarios/` as YAML validated by `schema.json` and executed through the harness in `server/src/security/evals/`.

## Categories

- **prompt-injection**: Instruction hierarchy attacks, role confusion, and covert exfiltration attempts.
- **tool-misuse**: Requests for non-allowlisted tools, budget/rate-limit exceedance, and out-of-scope resource access.
- **attribution**: Missing principal metadata, absent or malformed correlation IDs, and spoofed identities.
- **redaction**: Secret-like tokens or sensitive fields inside tool outputs that must be sanitized before traces/audit.

## Scenario Structure

- `id`, `name`, `description`, `intent`, `policyMode` (`strict`|`permissive`).
- `toolRequest`: requested tools, allowlist, optional budgets/resources.
- `attribution`: principal, correlation IDs, enforcement flags.
- `toolResponse`: simulated tool output for redaction assertions.
- `expected`: decision (`allow`/`deny`), required findings, assertions, and redaction expectations.

## Adding Scenarios

1. Create a new YAML file under `server/security/scenarios/` following `schema.json`.
2. Use deterministic prompts (no network calls) and keep tool lists scoped to Summit’s surface.
3. Add at least one `requiredFindings` entry to prevent silent passes.
4. Run `pnpm security:eval --scenario path/to/file.yaml` to validate locally.
5. Ensure per-category counts remain ≥3; CI will fail on coverage regressions.

## Determinism and Safety

- No external calls or live secrets are used; tool outputs are simulated.
- Redaction rules apply before traces are emitted.
- Policy mode defaults to strict; use `strict-only` flag in the CLI to enforce that subset.
