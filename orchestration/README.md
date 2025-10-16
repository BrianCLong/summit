# Chronos Aeternum (Temporal++)

Chronos Aeternum is an AI-native orchestration initiative that blends deterministic workflow execution with predictive intelligence, policy enforcement, and deep provenance. This repository slice provides the Phase 1 and Phase 2 scaffolding for the platform, including:

- **Intent Engine** – compiles natural language or YAML workflow descriptions into canonical intermediate representations (IR DAGs).
- **Deterministic Runtime** – a Go-based execution service with policy stubs, retry handling, activity adapters, and telemetry hooks.
- **Compliance & Observability Foundations** – starter OPA policies, OpenTelemetry wiring, provenance hashing, and CI automation.
- **Deployment Artifacts** – container and compose definitions for local iteration plus GitHub workflows for automated verification.

Subdirectories:

| Path | Description |
| --- | --- |
| `packages/intent-engine` | TypeScript compiler, CLI, and schema validators for authoring workflows. |
| `runtime/` | Go runtime responsible for executing IR graphs deterministically with retries, telemetry, and persistence. |
| `deploy/` | Container and docker-compose manifests for local development. |
| `examples/` | Example YAML workflows used in smoke tests and documentation. |
| `ops/` | Operational assets such as OPA policies. |
| `.github/workflows/` | Automation for CI, linting, and nightly NL→DAG→execute checks. |

## Getting Started

1. **Install Dependencies**
   - Node.js 20+
   - Go 1.22+
   - Docker (optional for local stack)

2. **Compile and Test the Intent Engine**

   ```bash
   cd packages/intent-engine
   npm install
   npm run build
   npm test
   ```

3. **Build and Test the Runtime**

   ```bash
   cd runtime
   make test
   ```

4. **Run the Local Stack**

   ```bash
   cd deploy/compose
   docker compose up --build
   ```

   The runtime listens on `http://localhost:8080` and connects to Postgres on port `5432`.

5. **Execute an Example Workflow**

   ```bash
   cd packages/intent-engine
   node dist/cli.js ../../examples/resize-images.yaml > /tmp/ir.json

   curl -s localhost:8080/v1/start -X POST \
     -H 'content-type: application/json' \
     --data-binary @<(jq -n --argfile ir /tmp/ir.json '{ir:$ir, actor:"demo"}')
   ```

   Use `/v1/status/<runId>` to inspect the execution state.

## Roadmap

- **Phase 3** will extend the state graph into Neo4j, add richer provenance bundles, and introduce predictive scheduling agents.
- Future iterations will integrate additional adapters, distributed scheduling, conversational explainability, and GitOps workflows.

