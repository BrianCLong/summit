# Dev stack bootstrap

This compose file mirrors the seven workstreams (prov-ledger, nl-cypher, lac-compiler, zk-tx, runbook-prover, ops-guard, tri-pane) behind a simple Traefik ingress on port 8080.

- Images are placeholders (`alpine:3.19`) so the stack starts quickly; swap in service images or local build contexts as teams wire endpoints.
- Use `make dev-up` / `make dev-down` from the repo root to manage the stack.
- Point fixtures at `fixtures/{small,medium}` to keep happy-path flows deterministic.
