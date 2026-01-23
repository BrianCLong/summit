# No Untracked Build Inputs Gate

## Purpose

Fails fast if untracked files would alter builds in CI or clean environments.

## Run

```bash
bash scripts/ci/verify_no_untracked_build_inputs.sh
```

## Scope

Checks untracked files under:

- `client/src/`
- `server/src/`
- `packages/`
- `scripts/`

Ignores typical dev artifacts (`*.log`, `*.tmp`, `node_modules/`, `dist/`, `build/`,
`coverage/`, `.DS_Store`).

