# Build Cache Tuner

The build cache tuner inspects PNPM, Turbo, Nx, and TypeScript caches in the workspace, flags slow or ineffective setups, and can apply safe optimizations.

## Usage

Run the tuner from the repository root:

```bash
node tools/cache-tuner/cli.js
```

Add `--json` to get a structured report or `--apply` to execute non-destructive fixes (creating cache directories, writing env exports, and running safe prune commands when needed). PNPM caches are relocated to `.cache/pnpm-store` so CI jobs can persist them between runs:

```bash
node tools/cache-tuner/cli.js --json --apply
```

The tuner writes environment exports to `.cache/cache-tuner.env` when it recommends relocating caches. Source the file locally or mount `.cache` as a persistent volume in CI to preserve caches between runs.
