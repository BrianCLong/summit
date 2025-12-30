# AGENT RULES — GA Hardening Scope

This file governs changes within `docs/ga/`, `scripts/ga/`, and `testing/ga-verification/`.

- Prefer documentation + deterministic scripts; do **not** modify global Jest/pnpm configuration.
- Tier B files must use the suffix `.ga.test.mjs` and avoid side effects.
- Update `agent-contract.json` when changing verification surfaces or guardrails.
- Run `make ga-verify` before opening a PR that touches this scope.
- GA-critical features must be mapped in `docs/ga/MVP-4-GA-VERIFICATION.md` and `docs/ga/verification-map.json`.
