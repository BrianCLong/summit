# Roadmap Normalization Report
## Project 19 Items Normalized
| Title | Priority | Effort | Risk | Milestone | Owner | Dependencies | Definition of Done | Evidence |
|---|---|---|---|---|---|---|---|---|
| Secure LLM Copilot & Retrieval: Local Vector Store | P0 | M | Low | MVP-4 GA | Jules | None | Status: rc-ready | Merge evidence: cdfacf7e includes server/src/lib/data-platform/ingest/service.ts (embedding ingestion + PGVector formatting), server/src/lib/data-platform/retrieval/service.ts (vector retrieval), server/src/memory/repositories/pageRepository.ts (pgvector storage) |
| Secure LLM Copilot & Retrieval: RAG Ingestion Pipeline | P0 | M | Low | MVP-4 GA | Jules | None | Status: rc-ready | Merge evidence: cdfacf7e includes server/src/lib/data-platform/rag/service.ts (RAG orchestration), server/src/lib/data-platform/ingest/service.ts (embedding ingest), server/src/maestro/graphrag-service.ts (GraphRAG assistant pipeline) |
| Secure LLM Copilot & Retrieval: Copilot Query Service | P0 | M | Low | MVP-4 GA | Jules | None | Status: rc-ready | Merge evidence: cdfacf7e includes server/src/services/CopilotIntegrationService.ts and server/src/services/CopilotNLQueryService.ts |
| Federation + Ingestion Mesh: Connector SDK & Registry | P1 | M | Low | MVP-4 GA | Jules | Need connector registry, Missing connector lifecycle management | Status: partial | Only CSVConnector.ts found; SDK framework incomplete |
| Federation + Ingestion Mesh: RSS/Atom Connector | P2 | M | Low | MVP-4 GA | Jules | No implementation exists | Status: not-started | No RSS/Atom connector implementation found |
| Federation + Ingestion Mesh: STIX/TAXII Connector | P2 | M | Low | MVP-4 GA | Jules | No implementation exists | Status: not-started | No STIX/TAXII connector implementation found |
| Platform Governance: Policy-as-Code Engine | P0 | M | Low | MVP-4 GA | Jules | None | Status: rc-ready | Merge evidence: cdfacf7e includes server/src/data-governance/policy/PolicyEngine.ts and server/src/middleware/opa.ts (OPA integration) |
| Platform Governance: Immutable Audit Log | P0 | M | Low | MVP-4 GA | Jules | None | Status: rc-ready | Merge evidence: cdfacf7e includes server/src/security/zero-trust/ImmutableAuditService.ts (immutable audit ledger), server/src/federal/worm-audit-chain.ts (WORM segments), server/src/provenance/ledger.ts (hash-chained provenance) |
| Platform Governance: Counterfactual Context Reassembly (CCR) | P2 | M | Low | MVP-4 GA | Jules | Need perturbation library and divergence metrics, Execution budget and observability controls not implemented | Status: not-started | ADR 0010 defines CCR perturbation, divergence analysis, and enforcement hooks for MCP poisoning detection |
| Serialization & Context Efficiency: KTOON core libraries | P1 | M | Low | MVP-4 GA | Amp | None | Status: in-progress | Pending |
| Graph-XAI Differentiation: Research Publications | P2 | M | Low | MVP-4 GA | Jules | None | Status: not-started | Publication plan and themes defined in ga-graphai/docs/explainability.md |
| Graph-XAI Differentiation: Public Explainability Benchmarks | P2 | M | Low | MVP-4 GA | Jules | None | Status: not-started | Benchmark suite, metrics, and harness expectations codified in ga-graphai/docs/explainability.md |
| Graph-XAI Differentiation: Case Studies | P2 | M | Low | MVP-4 GA | Jules | None | Status: not-started | Sector coverage, metrics, and distribution plan defined in ga-graphai/docs/explainability.md |
| Verify: Accessibility + Keyboard Gate | P0 | S | Med | MVP-4 GA | Jules | None | Pass e2e/a11y-keyboard/a11y-gate.spec.ts | reports/a11y-keyboard/README.md, .github/workflows/a11y-keyboard-smoke.yml |
| Verify: Demo Mode Hard Gate | P1 | S | Med | MVP-4 GA | Jules | None | Pass testing/ga-verification/ga-features.ga.test.mjs | scripts/demo-up.sh, docs/archive/README-UPDATED.md |
| Verify: Rate Limiting | P1 | S | Med | MVP-4 GA | Jules | None | Pass testing/ga-verification/ga-features.ga.test.mjs | docs/API_RATE_LIMITING.md |
| Verify: AuthN/AuthZ Helpers | P1 | S | Med | MVP-4 GA | Jules | None | Pass testing/ga-verification/ga-features.ga.test.mjs | docs/AUTHZ_IMPLEMENTATION_SUMMARY.md |
| Verify: Observability Taxonomy | P1 | S | Med | MVP-4 GA | Jules | None | Pass testing/ga-verification/ga-features.ga.test.mjs | summit_observability/METRICS.md, summit_observability/LOGS.md, summit_observability/EVENTS.md |
| Verify: Data Classification & Governance | P1 | S | Med | MVP-4 GA | Jules | None | Pass testing/ga-verification/ga-features.ga.test.mjs | docs/DATA_GOVERNANCE.md |
| Verify: Policy Preflight & Receipts | P1 | S | Med | MVP-4 GA | Jules | None | Pass scripts/ga/verify-ga-surface.mjs | PROVENANCE_SCHEMA.md |
| Verify: Ingestion Security Hardening | P1 | S | Med | MVP-4 GA | Jules | None | Pass testing/ga-verification/ga-features.ga.test.mjs | docs/security/security-architecture-and-policies.md |
