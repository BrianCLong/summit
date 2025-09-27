# IntelGraph Assistant v1 – Release PR

## Summary
Ships IntelGraph Assistant v1: streaming NDJSON + grounded answers + ERv2 + ABAC + full observability. PR gate uses unit/mocked tests; nightly services job exercises Neo4j/Redis/Python + Playwright + optional k6.

## Key areas
- Client: EnhancedAIAssistant, transports, grounded UX, cite pivots, voice hold-to-talk.
- Server: /assistant/stream|sse|socket, enrichment worker, GraphQL suggestions, ABAC, provenance, metrics/tracing.
- Ops: SLOs/alerts, circuit breaker, quotas, caches, docker-compose services, nightly CI.

## Risk & Mitigation
- Heavy integrations gated behind WITH_SERVICES=1; nightly workflow covers them.
- NDJSON framing covered by fuzz tests; heartbeats tolerated.
- ABAC enforced via directive + policy; tests added.

## Rollout
- Canary 5%→25%→100% with SLO guards.
- Feature flags: ASSISTANT_RAG, ER_V2, per-tenant transport/model tier in Admin Console.

## Post-merge
- Tag v1.0.0-assistant.
- Monitor SLO dashboards; confirm cache hit-rate and queue health.
- Nightly report on ERv2 precision and RAG cite rate.

---

## Release Checklist
- [ ] pnpm install
- [ ] pnpm run test:all (PR gate)
- [ ] (optional) run nightly services workflow manually once
- [ ] git checkout -b release/assistant-v1 && git push -u origin release/assistant-v1
- [ ] Tag with the prepared message and push

