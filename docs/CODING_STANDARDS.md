# Coding Standards

## TypeScript

- **Typing:** Prefer `readonly` props, discriminated unions, and `unknown` over `any`. Add `zod` validators on inputs crossing service boundaries.
- **Structure:** Keep modules under 300 lines; colocate types near resolvers/services; use barrel files sparingly.
- **Lint/Format:** `pnpm lint` + Prettier; no `eslint-disable` without justification. Enable strict null checks in new packages.
- **Testing:** Use Jest/Vitest with contract-style tests for GraphQL resolvers; snapshot only for API docs or UI skeletons.
- **Error handling:** Never swallow errors; log with pino and include trace/span ids when available.

## Python

- **Style:** Black + Ruff; type hints for all public functions. Avoid implicit `Any`—prefer `typing.Literal`/`TypedDict`.
- **Environments:** Use `.venv` managed by `make bootstrap`; isolate notebooks under `notebooks/` and gate them with `make lint`.
- **Testing:** Pytest with factories/fixtures; mark slow tests and keep unit tests <1s. Capture integration contracts when calling services.
- **Packaging:** Stick to `poetry.lock`/`requirements.txt`; pin dependencies and avoid editable installs in CI.

## Docker & Compose

- **Images:** Use multi-stage builds; strip dev tools from runtime layers. Pin base images (major.minor) and verify SBOMs via `make sbom`.
- **Compose profiles:** Prefer profiles (`ai`, `kafka`, `observability`) over ad-hoc overrides; align with `npm run quickstart` flags.
- **Security:** No plaintext secrets in images; read from env/secret stores. Enable non-root users where supported and expose minimal ports.
- **Health:** Add `HEALTHCHECK` instructions and ensure services respond on `/health`/`/ready` before dependencies start.
