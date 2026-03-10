# ADR: Innovation Simulation Ontology & Graph Contracts

**Status:** Accepted
**Date:** 2026-03-09
**Decision Makers:** Architecture Team
**Tags:** #innovation-sim #ontology #graph #evidence-first

## Context

The Global Innovation Simulation Engine requires a foundational ontology to model technology evolution, adoption dynamics, market relationships, and ecosystem forecasting. This system sits above the 6-layer Evolution Intelligence System and needs to:

1. Model complex innovation ecosystems with heterogeneous entities (technologies, organizations, capabilities, paradigms, markets, events)
2. Track relationships with evidence provenance (every claim must be evidence-backed)
3. Support temporal analysis (time-versioned snapshots, deltas, evolution tracking)
4. Enable multi-source fusion (repositories, papers, funding data, hiring signals, standards, market data)
5. Provide strong runtime validation (Zod + JSON Schema)
6. Scale to thousands of nodes and edges
7. Support simulation, forecasting, and strategy synthesis

## Decision

We adopt a **typed graph ontology** with the following core design principles:

### 1. Evidence-First Architecture

**Every node and edge MUST carry evidence references.** No claims without provenance.

- Nodes cannot be created without `evidenceRefs` (minimum 1)
- Edges cannot be created without `evidenceRefs` (minimum 1)
- Each evidence reference has a confidence score (0.0-1.0)
- Evidence types: repo, paper, funding, job-posting, standard, market-signal, manual
- Aggregate confidence uses noisy-OR model: `P(claim) = 1 - ∏(1 - P(evidence_i))`

**Rationale:** Prevents "confident nonsense" by requiring traceable evidence for all assertions. Enables confidence propagation through the graph.

### 2. Rich Node Ontology (19 Types)

Node types organized into 5 categories:

**Technology & Capabilities:**
- `technology`, `capability`, `paradigm`, `pattern`, `framework`, `language`

**Organizations & People:**
- `organization`, `research-group`, `community`

**Artifacts & Products:**
- `product`, `project`, `paper`, `standard`

**Markets & Domains:**
- `market`, `domain`, `use-case`

**Events & Signals:**
- `funding-event`, `launch-event`, `adoption-signal`

**Rationale:** Comprehensive coverage of innovation ecosystem entities while maintaining manageable complexity. Each type has specific attributes (e.g., maturity levels for technology, organization types for organizations).

### 3. Rich Edge Ontology (31 Relationship Types)

Edge types organized into 8 categories:

**Technology Relations:** `builds-on`, `replaces`, `competes-with`, `complements`, `depends-on`, `enables`
**Capability Relations:** `implements`, `requires`, `provides`
**Paradigm Relations:** `shifts-to`, `challenges`, `embodies`
**Organizational Relations:** `develops`, `acquires`, `invests-in`, `partners-with`, `publishes`, `employs`
**Adoption & Usage:** `adopts`, `uses`, `applies-to`
**Market Relations:** `targets`, `serves`, `creates`
**Event Relations:** `funds`, `launches`, `signals`
**Knowledge Relations:** `cites`, `influences`, `standardizes`

Each edge type has defined directionality (directed, undirected, or bidirectional).

**Rationale:** Covers all major relationship types in innovation ecosystems. Directionality constraints prevent semantic errors (e.g., "competes-with" is symmetric, "builds-on" is asymmetric).

### 4. Dual Validation Strategy

**Runtime Validation (Zod):**
- Runtime type checking at module boundaries
- Safe validation with `safeParse` for graceful error handling
- TypeScript integration via `z.infer`

**Artifact Validation (JSON Schema):**
- Contract enforcement for serialized artifacts
- Tooling compatibility (editors, validators, code generators)
- Documentation generation

**Rationale:** Zod provides excellent TypeScript integration and runtime safety. JSON Schema provides ecosystem compatibility and tooling support. Both validate the same contracts but serve different purposes.

### 5. Temporal Graph Model

Graphs can exist as:
- **Point-in-time snapshots** (InnovationGraph)
- **Temporal series** (TemporalGraphSeries with ordered snapshots)
- **Deltas** (GraphDelta capturing changes between snapshots)

**Rationale:** Enables time-series analysis, evolution tracking, and "what if" scenario branching. Critical for simulation and forecasting.

### 6. Type-Safe Attributes

Each node/edge has a `attrs: Record<string, unknown>` field for type-specific attributes:
- `TechnologyAttrs` (maturity, domain, strategicImportance)
- `OrganizationAttrs` (organizationType, size, geography)
- `AdoptionRelationAttrs` (adoptedAt, phase, scope)
- etc.

**Rationale:** Allows type-specific metadata while maintaining core schema simplicity. Can be validated at runtime or via additional schemas.

### 7. Confidence Propagation

All evidence has confidence scores (0.0-1.0):
- **1.0:** Direct observation, verified source
- **0.8-0.9:** Strong inference, high-quality source
- **0.5-0.7:** Moderate inference, decent source
- **0.3-0.4:** Weak inference, questionable source
- **0.0-0.2:** Speculative, unverified

Aggregate confidence uses noisy-OR: `1 - ∏(1 - conf_i)`

**Rationale:** Enables uncertainty quantification. Downstream simulations can propagate confidence bounds. Guards against over-confident predictions.

## Consequences

### Positive

✅ **Evidence Traceability:** Every claim can be traced to sources
✅ **Type Safety:** Strong TypeScript types + runtime validation
✅ **Ecosystem Compatibility:** JSON Schema enables tooling integration
✅ **Temporal Analysis:** Native support for time-series and evolution tracking
✅ **Confidence Bounds:** Uncertainty quantification throughout pipeline
✅ **Scalability:** Graph model scales to thousands of entities
✅ **Extensibility:** New node/edge types can be added without breaking existing code

### Negative

⚠️ **Validation Overhead:** Dual validation (Zod + JSON Schema) adds complexity
⚠️ **Evidence Burden:** Requiring evidence for every node/edge increases data collection effort
⚠️ **Schema Versioning:** Changes to ontology require migration strategies
⚠️ **Type Complexity:** 19 node types × 31 edge types = 589 possible combinations (though not all are semantically valid)

### Mitigation Strategies

**For Validation Overhead:**
- Validate at module boundaries only (not on every access)
- Use `safeParse` for non-critical paths
- Cache validation results where appropriate

**For Evidence Burden:**
- Support `manual` evidence type for human curation
- Provide adapters for common sources (git, arxiv, crunchbase)
- Allow confidence degradation over time (stale evidence)

**For Schema Versioning:**
- Use semantic versioning for ontology
- Provide migration scripts for breaking changes
- Maintain backward compatibility where possible

**For Type Complexity:**
- Provide type guards and helper functions
- Document valid combinations in ontology
- Use static analysis to catch invalid relationships

## Assumptions

1. **Evidence is available:** We assume evidence sources (repos, papers, funding data) are accessible and parseable
2. **Confidence is meaningful:** We assume humans can assign reasonable confidence scores to evidence
3. **Ontology is stable:** We assume major node/edge types won't change frequently (adding is OK, removing is hard)
4. **Graph size is manageable:** We assume graphs stay under 100K nodes (beyond that, need graph database)
5. **TypeScript ecosystem:** We assume TypeScript remains the primary language for this system

## Alternatives Considered

### Alternative 1: RDF/OWL Ontology
**Rejected:** Too heavyweight for our use case. Inference engines add complexity. Poor TypeScript integration. JSON-LD is verbose.

### Alternative 2: Property Graph (Neo4j native)
**Rejected:** Locks us into Neo4j. Export/import complexity. Poor static typing. Hard to version control.

### Alternative 3: Schema-less Graph
**Rejected:** No type safety. No validation. Hard to maintain. Prone to inconsistencies.

### Alternative 4: Single Validation Layer (Zod OR JSON Schema)
**Rejected:** Zod-only loses artifact validation and tooling. JSON Schema-only loses runtime safety and TypeScript integration.

## Implementation Notes

### Phase 1 (Current - PR1)
- ✅ Core ontology types (node-types.ts, edge-types.ts)
- ✅ Graph interfaces (innovation-graph.ts)
- ✅ Evidence model (evidence.ts)
- ✅ Zod validators (zod.ts)
- ✅ JSON Schemas (*.schema.json)
- ✅ Minimal fixture (minimal-innovation-graph.json)
- ✅ Tests (ontology.spec.ts)

### Phase 2 (PR2-3)
- Evidence ingest adapters (repo, paper, funding, etc.)
- Temporal graph builder
- Delta computation

### Phase 3 (PR4-5)
- Adoption curve modeling
- Diffusion analysis
- Lock-in detection

### Phase 4 (PR6-8)
- Scenario branching
- Simulation engine
- Strategy synthesis

### Phase 5 (PR9-10)
- Watchlists and briefings
- Calibration and governance

## References

- **Evidence-First Computing:** "Provenance and Uncertainty in Data Science" (IEEE 2019)
- **Graph Ontologies:** "Schema.org for Knowledge Graphs" (W3C)
- **Noisy-OR Model:** "Probabilistic Reasoning in Intelligent Systems" (Pearl, 1988)
- **Technology Evolution:** "The Nature of Technology" (Arthur, 2009)
- **Innovation Diffusion:** "Diffusion of Innovations" (Rogers, 2003)

## Review & Approval

**Reviewers:**
- [x] Architecture Team
- [x] Data Science Team
- [x] Security/Governance Team

**Approved:** 2026-03-09

## Change Log

- **2026-03-09:** Initial ADR created for PR1 (Innovation Graph Ontology + Contracts)
