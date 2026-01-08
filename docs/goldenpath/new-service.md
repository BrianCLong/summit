# Adding a New Service

## Checklist

1.  [ ] **Location**: Create a new directory in `services/<service-name>`.
2.  [ ] **Structure**:
    ```
    services/<service-name>/
    ├── src/
    │   ├── index.ts (Entrypoint)
    │   ├── config.ts
    │   └── ...
    ├── package.json
    ├── tsconfig.json
    ├── Dockerfile
    └── README.md
    ```
3.  [ ] **Dependencies**: use `pnpm add <pkg>` within the service directory.
4.  [ ] **Config**: Use environment variables defined in `src/config.ts` (validated with Zod).
5.  [ ] **Logging**: Use `@intelgraph/logger` (or standard `pino`).
6.  [ ] **Tests**: Add unit tests in `src/__tests__`.
7.  [ ] **CI**: Ensure `pnpm test` and `pnpm build` work from the service root.

## Anti-Patterns

- Do not add logic to `server/` unless it is a core platform change.
- Do not hardcode secrets.
- Do not bypass the API Gateway for external access.
