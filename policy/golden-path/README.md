# Golden Path OPA Bundle

This bundle enforces license allowlisting, CVE budgets, and secret scan requirements for paved-road services.

## Policies

- `license-allowlist.rego` – Blocks packages outside of MIT/Apache/BSD license families.
- `cve-budget.rego` – Enforces configurable high/critical vulnerability budgets.
- `secrets-gate.rego` – Requires zero unresolved TruffleHog findings.

## Usage

The GitHub Actions workflow hydrates `.opa/input.json` and evaluates `data.goldenpath`. Admission controllers should load the compiled bundle under `controllers/admission/`.
