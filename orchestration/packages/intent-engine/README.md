# Chronos Intent Engine

The intent engine converts natural-language or declarative workflow definitions into deterministic intermediate representations (IR DAGs).

## Capabilities
- Zod-based schema validation to guarantee structure and safety.
- Canonical node and edge ordering for reproducible hashes.
- CLI tool (`chronos-intent`) for local compilation.
- TypeScript SDK surface for programmatic access.

## Usage

```bash
npm install
npm run build
node dist/cli.js ../../examples/resize-images.yaml
```

The CLI prints an IR JSON payload suitable for POSTing to the runtime `/v1/start` endpoint.

## Testing

```bash
npm test
```

Vitest executes deterministic compiler tests and emits coverage reports.
