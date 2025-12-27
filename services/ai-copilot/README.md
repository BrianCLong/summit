# AI Copilot Service

AI Copilot provides LLM-backed assistance for Summit workflows, enabling natural language queries over intelligence data.

## Overview

The AI Copilot service integrates with:

- Vector store for semantic search
- LLM providers for query processing
- Graph database for entity context

## Operational Documentation

### Runbook

- [AI Copilot Service Runbook](../../RUNBOOKS/ai-copilot-service.md)

### SLOs

- Configuration: `slo/ai-copilot.yaml`
- Availability: 99.9%
- Latency: 99% of requests < 1s P95

### Alerting

- Rules defined in `ALERT_POLICIES.yaml`
- Key alerts:
  - `IntelGraphAICopilotErrorRate`
  - `IntelGraphAICopilotLatencyP95High`

## Deployment

1. Ensure SLO config is applied:

   ```bash
   kubectl apply -f slo/ai-copilot.yaml
   ```

2. Verify alerting rules:
   ```bash
   kubectl apply -f ALERT_POLICIES.yaml
   ```

## Development

```bash
# Install dependencies
pnpm install

# Run locally
pnpm dev

# Run tests
pnpm test
```

## Configuration

| Environment Variable | Description            | Default                    |
| -------------------- | ---------------------- | -------------------------- |
| `LLM_PROVIDER`       | LLM provider to use    | `openai`                   |
| `LLM_MODEL`          | Model name             | `gpt-4`                    |
| `VECTOR_STORE_URL`   | Vector store endpoint  | `http://vector-store:8080` |
| `MAX_CONTEXT_TOKENS` | Maximum context window | `8192`                     |

## Related Documentation

- [Copilot Playbook](../../docs/Copilot-Playbook.md)
- [RAG Pipeline](../../docs/rag-pipeline.md)
