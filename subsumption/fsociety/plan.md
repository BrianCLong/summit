# Fsociety Deep Subsumption Plan (Governance-First)

## Objective

Subsumption converts a menu-driven offensive-tool launcher concept into a Summit-native governance capability:

1. Descriptor catalog with explicit provenance.
2. Deny-by-default execution policy.
3. Deterministic evidence artifacts.
4. Drift monitoring for catalog and policy integrity.

## Minimal Winning Slice

Deliver one mergeable lane under `subsumption/fsociety/` that includes:

- `manifest.yaml` and `claims.md`.
- A verified repo reality check (`repo_assumptions.md`).
- PR-ready decomposition with deterministic acceptance checks.

## PR Stack (Constrained to 5)

1. **PR1: Catalog skeleton**
   - Add normalized external-tool descriptor schema and seed examples.
   - No execution support.
2. **PR2: Policy gate**
   - Add deny-by-default rule for unapproved tools and forbidden categories.
3. **PR3: Evidence lane**
   - Add deterministic `report/metrics/stamp` generation contract.
4. **PR4: Drift monitor**
   - Detect descriptor drift and approval regressions.
5. **PR5: Operator documentation**
   - Add runbook and data-handling controls.

## Acceptance Checks (Deterministic)

- `python3 -c "import pathlib, yaml; yaml.safe_load(pathlib.Path('subsumption/fsociety/manifest.yaml').read_text())"`
- `test -s subsumption/fsociety/claims.md`
- `test -s subsumption/fsociety/repo_assumptions.md`

## MAESTRO Security Alignment

- **MAESTRO Layers**: Agents, Tools, Observability, Security.
- **Threats Considered**: tool abuse, policy bypass, evidence forgery, sensitive log leakage.
- **Mitigations**: deny-by-default policy, immutable claim IDs, deterministic artifacts, never-log controls.

## Finality

The fsociety concept is subsumed as governance metadata and policy controls, not as offensive capability implementation.
