# Areas Map: Intent to Directories

Use this map to quickly navigate from **what you want to do** to **where to work**.

---

## UI / Frontend

**Intent:** Fix a UI bug, add a component, update styles

| Directory                | What's There           |
| ------------------------ | ---------------------- |
| `client/`                | Main React app (Vite)  |
| `client/src/components/` | React components       |
| `client/src/pages/`      | Page-level components  |
| `client/src/hooks/`      | Custom React hooks     |
| `client/src/store/`      | Redux state management |

**Validation Commands:**

```bash
pnpm -C client typecheck
pnpm -C client test
pnpm -C client build
```

---

## Backend / API

**Intent:** Fix an API bug, add an endpoint, update business logic

| Directory                | What's There                 |
| ------------------------ | ---------------------------- |
| `server/`                | Express/Apollo backend       |
| `server/src/routes/`     | REST API routes              |
| `server/src/graphql/`    | GraphQL resolvers and schema |
| `server/src/services/`   | Business logic services      |
| `server/src/middleware/` | Express middleware           |

**Validation Commands:**

```bash
pnpm -C server typecheck
pnpm -C server test:unit
pnpm -C server test:integration
```

---

## GraphQL Schema

**Intent:** Add/modify GraphQL types, queries, mutations

| Directory                       | What's There             |
| ------------------------------- | ------------------------ |
| `server/src/graphql/schema/`    | GraphQL type definitions |
| `server/src/graphql/resolvers/` | Query/mutation resolvers |
| `graphql/`                      | Shared GraphQL utilities |
| `api-schemas/`                  | Schema definitions       |

**Validation Commands:**

```bash
pnpm -C server codegen        # Regenerate types
pnpm -C server typecheck
pnpm jest contracts/          # Contract tests
```

---

## Shared Packages / Libraries

**Intent:** Update shared utilities, add cross-cutting functionality

| Directory                    | What's There            |
| ---------------------------- | ----------------------- |
| `packages/`                  | Shared NPM packages     |
| `packages/common-types/`     | Shared TypeScript types |
| `packages/feature-flags/`    | Feature flag utilities  |
| `packages/telemetry-config/` | Observability config    |

**Validation Commands:**

```bash
pnpm -C packages/<name> typecheck
pnpm -C packages/<name> test
pnpm -C packages/<name> build
```

---

## Microservices

**Intent:** Work on a standalone service

| Directory          | What's There             |
| ------------------ | ------------------------ |
| `services/`        | Standalone microservices |
| `services/<name>/` | Individual service       |

**Validation Commands:**

```bash
pnpm -C services/<name> typecheck
pnpm -C services/<name> test
pnpm -C services/<name> build
```

---

## CLI Tools

**Intent:** Add/fix CLI commands

| Directory          | What's There             |
| ------------------ | ------------------------ |
| `cli/`             | Main CLI tool            |
| `tools/`           | Developer tools          |
| `tools/summitctl/` | Summit control plane CLI |

**Validation Commands:**

```bash
pnpm -C cli build
pnpm -C cli test
```

---

## Infrastructure / DevOps

**Intent:** Update Docker, K8s, Terraform configs

| Directory            | What's There           |
| -------------------- | ---------------------- |
| `compose/`           | Docker Compose files   |
| `charts/`            | Helm charts            |
| `terraform/`         | Infrastructure as Code |
| `ops/`               | Operational scripts    |
| `.github/workflows/` | GitHub Actions         |

**Validation Commands:**

```bash
docker compose -f docker-compose.dev.yaml config  # Validate compose
helm lint charts/<name>                           # Lint Helm chart
terraform validate                                # Validate Terraform
```

---

## Orchestration / Pipelines

**Intent:** Configure data pipelines, background jobs, Maestro workflows

| Directory        | What's There           |
| ---------------- | ---------------------- |
| `.maestro/`      | Maestro orchestration  |
| `.orchestrator/` | Pipeline orchestration |
| `pipelines/`     | Data/ML pipelines      |
| `airflow/`       | Airflow DAGs           |

**Validation Commands:**

```bash
python3 pipelines/cli.py validate
make pipelines-validate
```

---

## Security / Compliance

**Intent:** Security fixes, compliance updates, policy changes

| Directory     | What's There             |
| ------------- | ------------------------ |
| `SECURITY/`   | Security documentation   |
| `compliance/` | Compliance documentation |
| `policies/`   | OPA policies             |
| `secrets/`    | Encrypted secrets (SOPS) |
| `audit/`      | Audit logs and evidence  |

**Validation Commands:**

```bash
pnpm security:scan
make secrets/lint
make policy-sim
```

---

## Documentation / Runbooks

**Intent:** Update documentation, add runbooks

| Directory   | What's There                  |
| ----------- | ----------------------------- |
| `docs/`     | General documentation         |
| `RUNBOOKS/` | Operational runbooks          |
| `.claude/`  | Claude Code CLI docs          |
| `adr/`      | Architecture Decision Records |

**Validation Commands:**

```bash
# Check links and spelling
pnpm lint -- --ext .md
```

---

## Testing

**Intent:** Add/fix tests, update test utilities

| Directory      | What's There               |
| -------------- | -------------------------- |
| `tests/`       | Root-level tests           |
| `tests/e2e/`   | End-to-end tests           |
| `testing/`     | Test utilities and helpers |
| `testdata/`    | Test fixtures              |
| `*/__tests__/` | Per-package test files     |

**Validation Commands:**

```bash
pnpm test                              # All tests
pnpm test -- --testPathPattern="e2e"   # E2E only
make ga                                # Full gate
```

---

## Quick Lookup Table

| Intent             | Primary Directory         | Secondary      |
| ------------------ | ------------------------- | -------------- |
| UI bug             | `client/`                 | -              |
| API bug            | `server/`                 | -              |
| GraphQL change     | `server/src/graphql/`     | `api-schemas/` |
| New shared utility | `packages/`               | -              |
| Microservice work  | `services/<name>/`        | -              |
| CLI change         | `cli/`                    | `tools/`       |
| Docker/K8s         | `compose/`, `charts/`     | `ops/`         |
| Pipeline/jobs      | `.maestro/`, `pipelines/` | -              |
| Security fix       | `server/src/middleware/`  | `SECURITY/`    |
| Docs update        | `docs/`                   | `RUNBOOKS/`    |
| Add tests          | `<package>/__tests__/`    | `tests/`       |
