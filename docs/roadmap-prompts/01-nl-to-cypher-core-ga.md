# Prompt #1: NL → Cypher (Core GA) - Glass-Box Graph Querying

**Target**: Core GA Q3 2025
**Owner**: AI/Graph team
**Depends on**: Neo4j 5.24.0, APOC, GDS

---

## Pre-Flight Checklist

Before running this prompt, verify:

```bash
# ✅ Check existing NLQ code
ls -la server/src/ai/nl-graph-query/nl-graph-query.service.ts
ls -la services/nlq/

# ✅ Verify Neo4j stack
docker exec summit-neo4j cypher-shell -u neo4j -p ${NEO4J_PASSWORD} "RETURN 1"
docker exec summit-neo4j cypher-shell -u neo4j -p ${NEO4J_PASSWORD} "CALL dbms.components() YIELD versions"

# ✅ Check APOC/GDS plugins
docker exec summit-neo4j cypher-shell -u neo4j -p ${NEO4J_PASSWORD} "CALL apoc.help('meta')"
docker exec summit-neo4j cypher-shell -u neo4j -p ${NEO4J_PASSWORD} "CALL gds.list()"
```

**Expected**: All commands succeed. If `nl-graph-query.service.ts` exists, you're extending existing code, not creating from scratch.

---

## Claude Prompt

```
You are an elite IntelGraph engineer implementing the NL→Cypher feature for Core GA.

CONTEXT:
- Stack: Node 18+ (Express + Apollo GraphQL), Neo4j 5.24.0-community, React 18 + Cytoscape.js
- Existing code: server/src/ai/nl-graph-query/nl-graph-query.service.ts (basic NL→Cypher translator)
- Available plugins: APOC (apoc.*), Graph Data Science (gds.*)
- Frontend structure: apps/web/src/components/

REQUIREMENTS:
You must extend the existing NL→Cypher implementation to add:

1. **Cost Estimation**: Before execution, estimate query cost using:
   - EXPLAIN plan analysis (dbHits, estRows)
   - APOC meta stats: apoc.meta.stats() for cardinality
   - GDS path costing for multi-hop queries (gds.alpha.shortestPath.*)
   - Return: {estimatedRows, estimatedMs, costScore}

2. **Sandbox Execution**:
   - All queries run in sandbox mode by default (maxExecutionTime: 5000ms)
   - Display diff if user edits generated Cypher
   - Require explicit confirmation before promoting to production
   - Provide rollback/undo for mutations

3. **Glass-Box Preview**:
   - Show EXPLAIN plan in UI
   - Display schema awareness (which node labels, relationship types exist)
   - Highlight query optimizations (index usage, etc.)

4. **Audit Trail**:
   - Log: {prompt, generatedCypher, estimates, executionPlan, result, user, timestamp}
   - Stream to audit service (Redis Streams or Kafka)
   - Include provenance chain (model version, template version)

DELIVERABLES:

1. server/src/ai/nl-graph-query/cost-estimator.ts
   - export class CypherCostEstimator
   - Methods: estimateCost(cypher), analyzeExplainPlan(plan), getSchemaSummary()
   - Unit tests: 10 queries with known costs

2. server/src/ai/nl-graph-query/sandbox-executor.ts
   - export class SandboxExecutor
   - Methods: execute(cypher, maxTime), diff(original, edited), rollback(txId)
   - Integration tests with Neo4j test container

3. server/src/ai/nl-graph-query/query-planner.ts (extend existing)
   - Add deterministic planner with function signatures
   - Template-based generation with schema awareness
   - Export generateCypher(prompt, schemaContext): {cypher, confidence, alternatives}

4. apps/web/src/components/query/NLQueryPanel.tsx
   - UI flow: Input → Generate → Preview (with cost) → Sandbox Run → Promote
   - Show diff editor if user modifies Cypher
   - Display EXPLAIN plan in collapsible section
   - Undo/rollback button for mutations

5. server/src/routes/nlq.ts (extend existing routes)
   - POST /api/nlq/generate - Generate Cypher from prompt
   - POST /api/nlq/estimate - Estimate cost of Cypher
   - POST /api/nlq/sandbox - Execute in sandbox
   - POST /api/nlq/promote - Promote to production
   - GET /api/nlq/schema - Get schema summary for awareness

6. Tests (≥95% syntactic validity on test prompts):
   - server/tests/nlq.cost-estimator.test.ts
   - server/tests/nlq.sandbox.test.ts
   - Create test dataset: server/tests/fixtures/nlq-test-prompts.json (20 prompts)
   - Red cases: route to human edit with suggestions

ACCEPTANCE CRITERIA (encode in tests):
✅ Generate syntactically valid Cypher for ≥95% of test prompts
✅ Sandbox mode enabled by default
✅ Cost estimates within 2x of actual execution
✅ Diff/undo supported for all mutations
✅ Audit records persisted to Redis Streams
✅ Schema awareness: query planner uses CALL db.labels(), db.relationshipTypes()

TECHNICAL CONSTRAINTS:
- Neo4j 5.24.0: Use CALL { ... } IN TRANSACTIONS for batching if needed
- APOC procedures: Assume apoc.* available (unrestricted)
- GDS: Use gds.graph.project() for cost estimation on virtual graphs
- TypeScript strict mode: false (match codebase convention)
- GraphQL: Add schema.graphql extensions if exposing via GraphQL

SAMPLE TEST PROMPTS (server/tests/fixtures/nlq-test-prompts.json):
[
  "Find all people connected to John Smith within 2 hops",
  "Show me organizations in the defense sector founded after 2010",
  "What's the shortest path between Entity A and Entity B?",
  "List all suspicious transactions over $10,000 in the last 30 days",
  "Find entities with no relationships",
  ...add 15 more
]

OUTPUT FORMAT:
Provide:
(a) File tree diff showing new/modified files
(b) Full TypeScript code with JSDoc comments
(c) Jest test suites with describe/it blocks
(d) GraphQL schema additions (if needed)
(e) Sample API requests/responses
(f) Migration guide for existing nl-graph-query.service.ts → new architecture

Do NOT:
- Hardcode Neo4j credentials (use env vars)
- Skip tests
- Use deprecated Neo4j features (avoid FOREACH for mutations)
- Ignore existing code (extend, don't replace)
```

---

## Success Metrics

- [ ] Generate Cypher for 20/20 test prompts with ≥95% syntactic validity
- [ ] Cost estimates accurate within 2x of actual execution
- [ ] Sandbox mode prevents runaway queries (maxExecutionTime enforced)
- [ ] Audit trail captures 100% of queries
- [ ] UI shows preview → estimate → sandbox → promote flow
- [ ] Rollback works for mutations

---

## Follow-Up Prompts

After initial implementation:

1. **Optimize for performance**: Add query caching, memoization of schema metadata
2. **Add natural language explanations**: Translate Cypher results back to prose
3. **Multi-turn refinement**: "Show me more details about the first result"

---

## References

- Existing code: `server/src/ai/nl-graph-query/nl-graph-query.service.ts`
- Tests: `server/tests/nlq.*.test.ts`
- Neo4j docs: https://neo4j.com/docs/cypher-manual/5/
- APOC: https://neo4j.com/docs/apoc/current/
- GDS: https://neo4j.com/docs/graph-data-science/current/
