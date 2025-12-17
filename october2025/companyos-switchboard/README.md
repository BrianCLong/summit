# CompanyOS Switchboard — Repo Skeleton (v0.1)

Local-first, policy-governed **company switchboard** with a Tauri desktop shell, a React web app,
a secure policy bundle, and a meeting co‑pilot integration path.

## Quick Start

```bash
make bootstrap   # installs toolchains, node deps, rust toolchain for Tauri
make dev         # runs the web app locally
make tauri-dev   # launches the Tauri desktop shell (after `make dev` in another terminal)
```

> All networked services are optional for local-first. See `deploy/local/docker-compose.switchboard.yml` for media + opa + NATS setup.

## Architecture & Roadmap

See [BUILD_MAP.md](./BUILD_MAP.md) for the "Missing Foundations Audit" and the comprehensive roadmap to unify Switchboard with the Enterprise Core (Governance, RBAC, Orchestration, and Schema).
