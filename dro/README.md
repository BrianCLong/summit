# Data Residency Optimizer (DRO)

DRO is a mixed-integer linear programming (MILP) planner that selects data placements across
regions while enforcing jurisdictional residency policies, latency SLOs, and cost objectives.

## Components

- **Python optimizer (`dro/`)** — core MILP engine with pluggable constraint loader, plan
  signing utilities, diffing helpers, and a CLI for generating signed placement plans.
- **TypeScript UI (`ui/dro-ui/`)** — lightweight React dashboard for inspecting signed plans and
  rendering deterministic diffs between revisions.
- **Benchmark suite (`benchmarks/dro/`)** — replayable scenario that validates the optimizer stays
  within 1% of the baseline objective and emits reproducible plan diffs.

## Quick start

1. Create a virtual environment (recommended):

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.in
   ```

   The optimizer depends on [`PuLP`](https://coin-or.github.io/pulp/) for solving MILPs.

2. Generate a signed plan:

   ```bash
   python -m dro.cli path/to/spec.json --output plan.json
   ```

   Use `--previous-plan` to emit a deterministic diff against an earlier signed plan.

3. Run the benchmark regression:

   ```bash
   python -m benchmarks.dro.benchmark_runner
   ```

4. Launch the UI (requires Node 18+):

   ```bash
   cd ui/dro-ui
   npm install
   npm run dev
   ```

   Paste two signed plans into the provided text areas to visualize placement summaries and diffs.

## Spec format overview

See `benchmarks/dro/sample_spec.json` for an end-to-end example. A spec must include:

- `datasets`: id, size (GB), tenants, and optional replica count.
- `regions`: region metadata plus storage and egress cost coefficients.
- `request_profiles`: requestor region, latency SLO, and per-dataset demand.
- `residency_rules`: allowed regions per dataset/tenant.
- `latency_matrix_ms`: round-trip latency in milliseconds between storage regions and
  requestor regions.
- `signing_secret`: used for deterministic HMAC signatures on emitted plans.

All hard constraints (residency, latency, replica counts) are enforced during optimization. Plans
include their input digest, solver status, and an HMAC-SHA256 signature for downstream auditing.
