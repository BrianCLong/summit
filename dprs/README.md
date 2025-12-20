# Differential Privacy Release Scheduler (DPRS)

The DPRS toolkit combines a Rust core engine with a TypeScript CLI to plan
metric releases under a shared privacy budget. The scheduler respects
frequency requirements (daily, weekly, monthly), supports group privacy scaling,
uses advanced composition to track cumulative loss, and prioritises critical
metrics ahead of nice-to-have requests.

## Components

- `core/`: Rust command line program that receives scheduling instructions as
  JSON on `stdin` and emits a schedule with per-release proofs.
- `cli/`: TypeScript CLI wrapper that prepares the input payload, calls the
  Rust engine via `cargo run`, and verifies the proofs returned by the core.

## Usage

1. Build the CLI once:

   ```bash
   cd dprs/cli
   npm install
   npm run build
   ```

2. Prepare a configuration similar to [`sample-config.json`](./sample-config.json)
   and run the scheduler:

   ```bash
   node dist/index.js schedule ../sample-config.json --output schedule.json
   ```

   The `dprs` binary is also published via the `bin` entry in `package.json`:

   ```bash
   npx --yes @summit/dprs-cli schedule ../sample-config.json
   ```

3. The CLI ensures that removing a report from the configuration frees budget by
   recomputing the plan and verifying proofs with an independent implementation
   of the advanced composition check.

### Customising the Rust manifest path

If `dprs/core` lives elsewhere, set `--manifest <path>` or
`DPRS_CORE_MANIFEST` to the location of `Cargo.toml` before running the CLI.
