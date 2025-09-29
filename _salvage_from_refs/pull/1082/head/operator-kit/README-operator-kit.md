````md
# Symphony Operator Kit

Adds: explainable routing, power windows, SSE events, Prometheus metrics, RAG freshness, GitHub ticketing.

## Quickstart

```bash
cp .env.example .env
npm i
npm run dev
just symphony-test
````

### Grafana

Import `grafana/symphony-ops-dashboard.json`. Point at your Prometheus with the `symphony_*` and `rag_*` metrics.

### Policy

Edit `config/router.policy.yml`. Tenants, allowlist, windows, LOA ceiling.

### GitHub

Set `GITHUB_TOKEN` (repo scope) and `GITHUB_REPO` (e.g., `acme/symphony`). Use `open-issue` Just target or POST to `/integrations/github/issues`.

### Security

CORS allowlist via `CORS_ORIGINS`. CSP enforces `default-src 'self'`, inline styles allowed for Mermaid. No user-supplied Mermaid without sanitization.

### Notes

* `plan.ts` uses naive window detection and cost tables; wire to your real latency/cost stats + cron parser.
* Replace execute stub with your runner (LiteLLM or provider SDK).
* `scheduler.ts` demonstrates a loop; integrate with your queue if you have one.

```
