# Gate Matrix

## Repo-wide gates (almost everyone)

- `pnpm -w lint`
- `pnpm -w typecheck`

## EP1 Policy gates

- `pnpm -w policy:test`
- plus server gates if TS enforcer touched: `pnpm --filter server test`

## EP2 / EP6 / EP7 / EP9 (server-scoped)

- `pnpm --filter server lint`
- `pnpm --filter server typecheck`
- `pnpm --filter server test`

## EP4 / EP5 (client-scoped)

- `pnpm --filter client lint`
- `pnpm --filter client typecheck`
- `pnpm --filter client test:mcp`
- if Playwright touched: `pnpm --filter client test:golden-path`

## EP3 (pipelines python)

- Whatever harness is added (e.g., `python -m ...`), plus “no JS gates required” unless files outside pipelines are touched.

## EP8 (workflows-only)

- YAML sanity + “no code gates needed,” but it must not break required checks.
