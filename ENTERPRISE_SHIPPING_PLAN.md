# Summit Enterprise Shipping Priorities

This note distills immediate shipping recommendations from the deep-dive report into an execution-ready list focused on enterprise readiness. Ordering reflects blocking value for pilots and RFPs.

## Must-Ship First
1. **SOC 2 Type II / FedRAMP Moderate preparation**
   - Publish a control matrix aligned to current implementations (JWT rotation, PII scrubbing, persisted queries, audit trails).
   - Establish auditor integration path (e.g., Vanta) and minimum viable evidence collection.
2. **HashiCorp Vault secret management**
   - Replace static `.env` secrets with Vault-issued credentials; enforce refusal to start with defaults in prod.
3. **Post-quantum crypto pilot**
   - Prototype Kyber/Dilithium-signed tokens in `server/src/auth` and validate against health endpoints.
4. **Chaos engineering for 99.99% SLA**
   - Add failure-injection targets (Neo4j/Redis/Postgres) to the smoke path; measure MTTR <30s.

## Next to Unblock Scale & RFPs
5. **Kubernetes-native Helm profile**
   - Finalize `values/prod.yaml` with autoscaling, RBAC/OPA hooks, and tenant isolation defaults.
6. **Federated ingestion (STIX/TAXII 2.1)**
   - Ship TAXII client/server endpoints in `server/src/ingestion`; validate with demo investigations.
7. **Multi-tenancy with quotas**
   - Enforce tenant-scoped schemas/claims and per-tenant resource limits; verify no cross-talk across three test tenants.

## Demo-Winning Tiebreakers
8. **Narrative simulation LLM adapter**
   - Integrate Groq/Claude via LiteLLM; demo crisis-response scenario with streamed arcs.
9. **Cross-modal fusion UX**
   - Add "Fusion Score" widget and Playwright E2E proving image+audio → entities+relations workflow.

## Delivery Notes
- **Golden-path smoke test stays mandatory** on all changes; extend for chaos cases before merging infrastructure updates.
- Favor **deployable-first** branches: small, linear PRs that keep `start.sh` green and avoid touching archive data.
