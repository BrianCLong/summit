# Summit Flywheel Setup (SFS)

This directory hosts the Summit Flywheel Setup toolkit—a multi-PR initiative to
ship a resumable, security-first installer and workflow kit for Summit agents.
This initial drop provides scaffolding only; subsequent PRs will fill in the
installer phases, module system, and validation harnesses.

## Quickstart (scaffolding stage)

Clone the repository and run the CLI wrapper:

```bash
cd tools/summit-flywheel-setup
./bin/sfs help
./bin/sfs preflight --json
```

Use `install.sh` directly when debugging installer behaviors:

```bash
./install.sh help
```

Future PRs will deliver full support for `--dry-run`, `--print-plan`, module
selection flags, resumable state, and the safety rails described in
`docs/WORKFLOW.md`.
