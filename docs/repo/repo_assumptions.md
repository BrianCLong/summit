# Repository Assumptions

**Validated:**
- TypeScript + Node monorepo using pnpm.
- Workspace dependencies mapped via `package.json`.

**Assumptions (pending exact CI naming validation):**
- Gateway and existing API integrations use a standard proxy route layer.
- OPA ABAC policies are enforced at the top level, mapped to `policies/mcp`.
