# Context Pruner Service

Summit Context Pruner is a FastAPI service that scores token relevance, aggregates to sentence and span scores, and prunes context with a budget-aware packer.

## Local development

```bash
uvicorn services.context-pruner.src.main:app --reload --port 8090
```

### Docker Compose

```bash
docker compose -f services/context-pruner/docker-compose.context-pruner.yml up --build
```

## Environment variables

- `CONTEXT_PRUNER_MODE` (`mock` | `model`): default `mock`.
- `CONTEXT_PRUNER_MODEL_ID`: default `zilliz/semantic-highlight-bilingual-v1`.
- `CONTEXT_PRUNER_MODEL_REVISION`: pinned model revision.
- `CONTEXT_PRUNER_TRUST_REMOTE_CODE`: `true` only in sandboxed runtime.
- `CONTEXT_PRUNER_CACHE_TTL_SECONDS`: cache TTL for request hashing.
- `CONTEXT_PRUNER_ALLOWLIST`: comma-separated allowlist of model IDs.

## Security

Model loading is allowlisted and pinned to a revision. `trust_remote_code` is off by default and must be explicitly enabled in sandboxed environments.
