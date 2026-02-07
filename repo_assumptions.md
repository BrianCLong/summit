# Repo Assumptions

## ❌ Invalid Assumptions

- Assumed `AGENTS.md` did not exist (it does, and is authoritative).
- Assumed simple `src/` structure (it is a monorepo with `server/`, `client/`, `packages/`).
- Assumed we could just "add" context engineering artifacts without integrating into existing "Agent Lattice".
- Assumed standard `npm` (it is strict `pnpm`).

## ✅ Confirmed Assumptions

- Node/TypeScript environment.
- GitHub Actions for CI.
- Existence of `docs/` folder.
- CLI entrypoint availability (implied by `summitctl` in `package.json`).

