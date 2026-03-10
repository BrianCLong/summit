# Innovation Simulation System

Global Innovation Simulation Engine for modeling technology evolution, adoption dynamics, and ecosystem forecasting.

## Overview

The Innovation Simulation System provides a typed graph ontology and evidence-backed framework for:

- **Technology Evolution Modeling:** Track how technologies, paradigms, and patterns evolve over time
- **Adoption Dynamics:** Model adoption curves, diffusion patterns, and lock-in effects
- **Ecosystem Forecasting:** Simulate future innovation trajectories and competitive dynamics
- **Strategy Synthesis:** Generate evidence-backed recommendations for technology strategy

This system sits above the 6-layer Evolution Intelligence System and provides the foundation for multi-decade innovation simulation.

## Architecture

### Core Components

1. **Graph Ontology**
   - 19 node types (technology, organization, capability, market, etc.)
   - 31 edge types (develops, adopts, enables, competes-with, etc.)
   - Type-safe attributes for domain-specific metadata

2. **Evidence Model**
   - Every node and edge requires evidence references
   - 7 evidence types: repo, paper, funding, job-posting, standard, market-signal, manual
   - Confidence scores (0.0-1.0) with noisy-OR aggregation

3. **Validation**
   - Runtime validation (Zod)
   - Artifact validation (JSON Schema)
   - Graph integrity checks (referential integrity, confidence bounds)

4. **Temporal Model**
   - Point-in-time snapshots
   - Time-series with deltas
   - Evolution tracking

## Installation

```bash
pnpm install
```

## Usage

### Import Types and Validators

```typescript
import {
  // Core types
  type InnovationNode,
  type InnovationEdge,
  type InnovationGraph,
  type EvidenceRef,

  // Validation
  validateGraph,
  validateNode,
  validateEdge,

  // Ontology
  getAllNodeTypes,
  getAllEdgeTypes,
  isValidNodeType,
  isValidEdgeType,
} from "@summit/innovation-sim";
```

### Create Evidence-Backed Nodes

```typescript
const transformersNode: InnovationNode = {
  id: "tech-transformers",
  type: "technology",
  name: "Transformers",
  description: "Neural network architecture for sequence modeling",
  attrs: {
    maturity: "mature",
    domain: ["nlp", "deep-learning"],
    strategicImportance: "critical",
  },
  firstSeenAt: "2017-06-12T00:00:00Z",
  evidenceRefs: [
    {
      id: "evidence-001",
      type: "paper",
      source: "arxiv:1706.03762",
      uri: "https://arxiv.org/abs/1706.03762",
      observedAt: "2017-06-12T00:00:00Z",
      confidence: 1.0,
      metadata: {
        title: "Attention Is All You Need",
        authors: ["Vaswani et al."],
      },
    },
  ],
};

// Validate
validateNode(transformersNode); // throws on error
```

### Create Evidence-Backed Edges

```typescript
const developsEdge: InnovationEdge = {
  id: "edge-001",
  type: "develops",
  from: "org-google-research",
  to: "tech-transformers",
  weight: 1.0,
  evidenceRefs: [
    {
      id: "evidence-002",
      type: "paper",
      source: "arxiv:1706.03762",
      observedAt: "2017-06-12T00:00:00Z",
      confidence: 1.0,
      metadata: {
        affiliation: "Google Brain",
      },
    },
  ],
};

validateEdge(developsEdge);
```

### Build and Validate Graphs

```typescript
const graph: InnovationGraph = {
  metadata: {
    id: "innovation-graph-2026",
    version: "2026-03-09T00:00:00Z",
    createdAt: "2026-03-09T00:00:00Z",
    description: "Q1 2026 Innovation Landscape",
  },
  nodes: [transformersNode, /* ... */],
  edges: [developsEdge, /* ... */],
};

// Validate entire graph (includes referential integrity)
validateGraph(graph);
```

### Safe Validation

```typescript
import { safeValidateNode } from "@summit/innovation-sim";

const result = safeValidateNode(potentiallyInvalidNode);

if (result.success) {
  console.log("Valid node:", result.data);
} else {
  console.error("Validation errors:", result.error.errors);
}
```

## Node Types

### Technology & Capabilities
- `technology` - Specific technology (e.g., "Transformers", "WASM")
- `capability` - Business/technical capability (e.g., "Real-time ML inference")
- `paradigm` - Paradigm shift (e.g., "Microservices", "Serverless")
- `pattern` - Design pattern or practice (e.g., "CQRS", "Event Sourcing")
- `framework` - Software framework (e.g., "React", "PyTorch")
- `language` - Programming language (e.g., "Rust", "TypeScript")

### Organizations & People
- `organization` - Company, institution, or research lab
- `research-group` - Academic or corporate research group
- `community` - Open source community, consortium, standards body

### Artifacts & Products
- `product` - Commercial product or service
- `project` - Open source project or initiative
- `paper` - Research paper or publication
- `standard` - Technical standard or specification

### Markets & Domains
- `market` - Market segment or industry vertical
- `domain` - Technical domain (e.g., "NLP", "Computer Vision")
- `use-case` - Specific application or use case

### Events & Signals
- `funding-event` - Funding round, investment, acquisition
- `launch-event` - Product launch, project release
- `adoption-signal` - Adoption milestone or signal

## Edge Types

### Technology Relations
`builds-on`, `replaces`, `competes-with`, `complements`, `depends-on`, `enables`

### Capability Relations
`implements`, `requires`, `provides`

### Paradigm Relations
`shifts-to`, `challenges`, `embodies`

### Organizational Relations
`develops`, `acquires`, `invests-in`, `partners-with`, `publishes`, `employs`

### Adoption & Usage
`adopts`, `uses`, `applies-to`

### Market Relations
`targets`, `serves`, `creates`

### Event Relations
`funds`, `launches`, `signals`

### Knowledge Relations
`cites`, `influences`, `standardizes`

## Evidence Types

1. **repo** - Git repository artifacts (commits, PRs, issues)
2. **paper** - Research papers, preprints, technical reports
3. **funding** - VC rounds, grants, acquisitions
4. **job-posting** - Hiring signals (roles, skills, team sizes)
5. **standard** - Standards bodies, RFCs, specifications
6. **market-signal** - Product launches, adoption metrics, usage data
7. **manual** - Human-curated observations

## Confidence Scoring

All evidence has confidence scores (0.0-1.0):

- **1.0** - Direct observation, verified source
- **0.8-0.9** - Strong inference, high-quality source
- **0.5-0.7** - Moderate inference, decent source
- **0.3-0.4** - Weak inference, questionable source
- **0.0-0.2** - Speculative, unverified

Aggregate confidence uses **noisy-OR model**:
```
P(claim) = 1 - ∏(1 - P(evidence_i))
```

## Testing

Run tests:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test:watch
```

Type check:
```bash
pnpm typecheck
```

## Fixtures

Minimal test fixture available at:
```
services/innovation-sim/testing/fixtures/minimal-innovation-graph.json
```

This fixture demonstrates:
- 4 nodes (technology, organization, capability, framework)
- 4 edges (develops, implements, enables, provides)
- Evidence-backed assertions
- Valid statistics

## Schemas

JSON Schemas available at:
- `schemas/innovation-node.schema.json`
- `schemas/innovation-edge.schema.json`
- `schemas/innovation-graph.schema.json`

Use these for:
- Editor autocomplete and validation
- External tooling integration
- Code generation
- Documentation generation

## Design Principles

1. **Evidence-First:** No claims without evidence references
2. **Confidence Propagation:** Uncertainty quantification throughout
3. **Type Safety:** Strict TypeScript + runtime validation
4. **Temporal Awareness:** Built-in support for time-series analysis
5. **Graph Integrity:** Referential integrity enforced at validation time
6. **Extensibility:** New node/edge types can be added without breaking changes

## Roadmap

- ✅ **PR1:** Innovation Graph Ontology + Contracts (Current)
- 🔄 **PR2:** External Evidence Ingest Adapters
- 🔄 **PR3:** Temporal Innovation Graph Builder
- 🔄 **PR4:** Adoption Curve Engine
- 🔄 **PR5:** Diffusion + Lock-in Engine
- 🔄 **PR6:** Scenario Schema + Branch Builder
- 🔄 **PR7:** Quarterly Simulation Core
- 🔄 **PR8:** Strategy Synthesis Engine
- 🔄 **PR9:** Watchlists + Briefing Outputs
- 🔄 **PR10:** Calibration + CI Governance

## License

Proprietary - Summit Platform

## References

- ADR: [docs/adr/ADR-innovation-sim-ontology.md](../../docs/adr/ADR-innovation-sim-ontology.md)
- Evolution Intelligence System: [services/repoos/](../repoos/)
