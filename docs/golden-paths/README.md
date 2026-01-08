# Golden Paths

"Golden Paths" (or Paved Roads) are supported, opinionated ways to build common artifacts in the IntelGraph platform. By following these paths, you get:

- **Security by default** (auth, audit, sanitization)
- **Observability baked in** (metrics, logging, tracing)
- **Consistency** (standard project structure and naming)
- **Velocity** (scaffolding and automated checks)

## Available Paths

1.  **[New Endpoint](./NEW_ENDPOINT.md)** - Add a new REST API endpoint to the Node.js server.
2.  **[New UI Page](./NEW_UI_PAGE.md)** - Add a new React page to the web application.
3.  **[New Job](./NEW_JOB.md)** - Add a background job processor using BullMQ.
4.  **[New Event](./NEW_EVENT.md)** - Define a new canonical event for the platform.
5.  **[New Migration](./NEW_MIGRATION.md)** - Create a database migration (Postgres or Neo4j).

## Usage

Use the scaffolding tool to generate code:

```bash
# Generate a new endpoint
npm run scaffold endpoint <name>

# Generate a new UI page
npm run scaffold page <Name>

# Generate a new job
npm run scaffold job <name>
```

## Compliance

The CI pipeline enforces Golden Path compliance via `npm run check:golden`.

### Rules

- **Endpoints**: Every file in `server/src/routes/` must have a corresponding test file in `server/src/routes/__tests__/`.

### Exceptions

If a file does not need a test (e.g., legacy or utility), add `// @golden-path-ignore` to the file content.
