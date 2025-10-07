# pnpm Shim

This directory contains an offline-friendly launcher used by repo scripts.

## Usage
- Optional: download `pnpm-9.6.0.cjs` from `https://registry.npmjs.org/pnpm/-/pnpm-9.6.0.tgz` and place it here.
- Alternatively set `PNPM_BIN` to an existing pnpm binary.

The repo scripts call `node tools/pnpm/run-pnpm.js ...` via npm to ensure deterministic behaviour in sandboxes where Corepack cannot reach the network.
