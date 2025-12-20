# ADR-0012: Copilot Architecture - GraphRAG + Policy

**Date:** 2024-04-10
**Status:** Accepted
**Area:** AI/ML
**Owner:** AI/Copilot Guild
**Tags:** copilot, graphrag, policy, ai, rag, llm

## Context

Summit's AI Copilot assists analysts with:
- **Natural language queries**: "Find all entities connected to Person X via suspicious transactions"
- **Evidence synthesis**: Summarize investigation findings, generate reports
- **Relationship discovery**: Uncover hidden patterns in graph data
- **Anomaly detection**: Highlight unusual behaviors, patterns
- **Policy-aware responses**: Respect authority, compartment, and classification constraints

Requirements:
- **Accurate retrieval**: Find relevant entities, documents, relationships from graph + documents
- **Context-aware generation**: LLM responses grounded in retrieved facts
- **Policy enforcement**: Never leak data across compartments or authorities
- **Explainability**: Cite sources, show reasoning chains
- **Performance**: <5s p95 for typical copilot queries
- **Cost control**: Minimize LLM tokens, optimize retrieval

Challenges:
- Naive RAG misses graph relationships (treats documents as flat)
- LLMs hallucinate without grounding
- Policy violations if context leaks across compartments

## Decision

We will implement **GraphRAG** (Graph-based Retrieval-Augmented Generation) with policy-aware context assembly.

### Core Decision
GraphRAG architecture:
1. **User query** → Query understanding (intent, entities, filters)
2. **Hybrid retrieval**:
   - Vector search for semantically similar documents (pgvector)
   - Graph traversal for related entities, relationships (Neo4j)
   - Keyword search for exact matches (Postgres full-text)
3. **Policy filtering**: Remove contexts violating user's authorities/compartments
4. **Context ranking**: Score and rank retrieved contexts by relevance
5. **LLM generation**: Generate response grounded in retrieved, policy-filtered contexts
6. **Citation**: Return source references for every claim

Policy enforcement:
- **Pre-retrieval filtering**: Scope searches to user's compartments
- **Post-retrieval filtering**: Double-check authority on every context
- **Generation constraints**: Inject policy rules into LLM system prompt
- **Output scanning**: Detect and redact policy violations in LLM responses

### Key Components
- **Query Analyzer**: Parse user query, extract entities/intent
- **Hybrid Retriever**: Orchestrate vector + graph + keyword search
- **Policy Filter**: Apply ABAC rules to retrieved contexts
- **Context Assembler**: Build LLM prompt from ranked, filtered contexts
- **LLM Orchestrator**: Call Anthropic Claude with assembled context
- **Citation Tracker**: Map LLM claims to source documents/entities
- **Audit Logger**: Record all copilot interactions in provenance ledger

## Alternatives Considered

### Alternative 1: Standard RAG (Vector-only)
- **Pros:** Simple, fast, well-understood
- **Cons:** Misses graph relationships, shallow understanding
- **Cost/Complexity:** Low complexity, inadequate for graph intelligence

### Alternative 2: Fine-tuned Model
- **Pros:** No retrieval needed, fast inference
- **Cons:** Expensive training, stale data, hallucination risk, no policy enforcement
- **Cost/Complexity:** High upfront cost, poor data freshness

### Alternative 3: LLM Function Calling
- **Pros:** Flexible, LLM decides which tools to call
- **Cons:** Expensive (many LLM calls), latency, harder policy enforcement
- **Cost/Complexity:** High cost per query, slower

## Consequences

### Positive
- Graph traversals + vector search provide comprehensive context retrieval
- Policy filtering ensures compartment and authority compliance
- Citations enable analysts to verify AI claims
- Hybrid retrieval balances precision (graph) and recall (vectors)
- Context ranking minimizes LLM tokens (only send relevant contexts)

### Negative
- Complex architecture (vector DB, graph DB, LLM orchestration)
- Latency sensitive to retrieval performance (3-4 seconds typical)
- Policy filtering can over-redact (false positives)
- Token costs scale with context size (mitigated by ranking)
- LLM non-determinism complicates testing

### Operational Impact
- **Monitoring**: Track query latency, retrieval precision/recall, LLM token usage, policy violations
- **Performance**: Optimize vector search, graph queries, context ranking
- **Compliance**: Log all copilot queries and responses in provenance ledger
- **Cost**: Monitor LLM API costs, optimize context size

## Code References

### Core Implementation
- `server/src/services/rag.ts` - RAG orchestration service
- `server/src/services/copilot/` - Copilot query handling
- `server/src/services/SimilarityService.ts` - Vector similarity search
- `server/src/graph/GraphRAGService.ts` - Graph traversal for RAG

### GraphQL Schema
- `server/src/graphql/schema/graphrag.graphql` - Copilot query schema
- `client/src/graphql/queries/graphrag.graphql` - Client copilot queries

### Policy Integration
- `services/authz-gateway/src/copilot-policy.ts` - Policy filtering for copilot
- `server/src/services/copilot/PolicyFilter.ts` - Context policy filtering

### LLM Integration
- `server/src/llm/anthropic.ts` - Anthropic Claude API client
- `server/src/llm/prompt-templates/` - System prompts for copilot

## Tests & Validation

### Unit Tests
- `tests/unit/copilot/QueryAnalyzer.test.ts` - Query parsing
- `tests/unit/copilot/ContextAssembler.test.ts` - Context ranking
- Expected coverage: 85%+

### Integration Tests
- `tests/integration/copilot/graphrag.test.ts` - End-to-end copilot queries
- `tests/integration/copilot/policy-filtering.test.ts` - Policy enforcement

### Evaluation Tests
- `tests/eval/copilot/retrieval-quality.test.ts` - Retrieval precision/recall
- `tests/eval/copilot/generation-quality.test.ts` - LLM response quality
- `tests/eval/copilot/policy-compliance.test.ts` - No cross-compartment leaks
- Target: 95%+ policy compliance, 80%+ retrieval precision

### CI Enforcement
- `.github/workflows/copilot-tests.yml` - Copilot integration and eval tests
- Policy compliance tests block PRs if violations detected

## Migration & Rollout

### Rollout Plan
1. **Phase 1**: Beta launch to 10% of users (internal analysts)
2. **Phase 2**: Monitor retrieval quality, policy violations, latency
3. **Phase 3**: Tune context ranking, expand to 50% of users
4. **Phase 4**: GA launch at 100%

### Feature Flags
- `copilot.enabled`: Master switch
- `copilot.graphrag.enabled`: Use GraphRAG vs. vector-only RAG
- `copilot.policy_filter.strict`: Strict vs. permissive policy filtering

## References

### Related ADRs
- ADR-0006: Neo4j Graph Store (used for graph traversals in GraphRAG)
- ADR-0009: Postgres pgvector (used for vector similarity search)
- ADR-0002: ABAC Step-Up Auth (policy enforcement for copilot contexts)
- ADR-0010: Multi-Tenant Compartment (copilot respects compartment boundaries)

### External Resources
- [GraphRAG Paper](https://arxiv.org/abs/2404.16130)
- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [RAG Best Practices](https://www.anthropic.com/research/retrieval-augmented-generation)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2024-04-10 | AI Guild | Initial version |
| 2024-05-15 | AI Guild | Updated with policy filtering details |
