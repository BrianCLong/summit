# Prompt Portfolio Integration Guide

This document describes the 11 high-impact services implementing the Summit/IntelGraph Council Wishbook priorities.

## Overview

All 11 services are now implemented and integrated into the Summit/IntelGraph monorepo:

### Provenance & Trust (Prompts #1, #2, #3)

1. **PCA Verifier** (`services/pca-verifier`)
   - Proof-Carrying Analytics with signed manifests
   - Deterministic replay verification
   - Integration: `prov-ledger`, `audit_svc`

2. **ZK-TX** (`services/zk-deconfliction`)
   - Zero-knowledge selector overlap detection
   - Salted commitments + ZK proofs
   - Integration: `policy-compiler`, `investigation` services

3. **Policy Compiler (LAC)** (`services/policy-compiler`)
   - YAML → executable authorization checks
   - Policy simulation & diffing
   - Integration: Express middleware, OPA integration points

### Analyst Velocity (Prompts #4, #5, #8, #9)

4. **Schema Ingest Wizard** (`services/schema-ingest-wizard`)
   - CSV/JSON → canonical entities
   - PII detection, lineage tracking
   - Integration: `entity` repos, `prov-ledger`

5. **Entity Resolution** (`packages/entity-resolution`)
   - Deterministic + probabilistic matching
   - Explainable scorecards
   - Integration: `EntityRepo`, `prov-ledger`

8. **GraphRAG Copilot** (`services/graphrag-copilot`)
   - Natural language → Cypher + citations
   - Policy-aware redaction
   - Integration: Neo4j, `policy-compiler`, `copilot` service

9. **Tri-Pane UX** (`packages/tri-pane-ux`)
   - Graph + Timeline + Map synchronized views
   - "Explain this View" panel
   - Integration: React UI, `web` app

### Decision Quality (Prompts #6, #7, #10)

6. **Hypothesis Workbench (ACH)** (`services/hypothesis-workbench`)
   - Competing hypotheses with Bayesian updates
   - Evidence citations, dissent capture
   - Integration: `investigation` service, `prov-ledger`

7. **COA Planner** (`services/coa-planner`)
   - Course-of-Action DAG modeling
   - Monte Carlo "what-if" simulation
   - Integration: Decision workflows, `investigation`

10. **Dialectic Agents (DCQ)** (`services/dialectic-agents`)
    - Paired adversarial reasoners
    - Decision Debate Record (DDR)
    - Integration: `copilot`, analysis workflows

### Process Acceleration (Prompt #11)

11. **PRD Generator** (`services/prd-generator`)
    - PRD scaffold + acceptance pack
    - MoSCoW matrix, k6/Jest tests
    - Integration: Developer workflows, CLI

## Quick Start

### Install All Services

```bash
# From monorepo root
pnpm install

# Build all services
pnpm build
```

### Individual Service Quick Start

```bash
# PCA Verifier
cd services/pca-verifier
pnpm install && pnpm build
pnpm pca build --input fixtures/sample.csv --dag fixtures/sample-dag.json

# ZK Deconfliction
cd services/zk-deconfliction
pnpm install && pnpm build
pnpm start  # Runs on :3100

# Policy Compiler
cd services/policy-compiler
pnpm install && pnpm build

# Schema Ingest Wizard
cd services/schema-ingest-wizard
pnpm install && pnpm build

# Entity Resolution
cd packages/entity-resolution
pnpm install && pnpm build

# Hypothesis Workbench
cd services/hypothesis-workbench
pnpm install && pnpm build

# COA Planner
cd services/coa-planner
pnpm install && pnpm build

# GraphRAG Copilot
cd services/graphrag-copilot
pnpm install && pnpm build

# Tri-Pane UX
cd packages/tri-pane-ux
pnpm install && pnpm build

# Dialectic Agents
cd services/dialectic-agents
pnpm install && pnpm build

# PRD Generator
cd services/prd-generator
pnpm install && pnpm build
```

## Integration Patterns

### Pattern 1: Provenance-First Analytics

```typescript
// 1. Ingest with lineage
import { SchemaMapper } from '@intelgraph/schema-ingest-wizard';
const wizard = new SchemaMapper();
const entities = wizard.ingest(data, config);

// 2. Resolve entities with audit
import { EntityResolver } from '@intelgraph/entity-resolution';
const resolver = new EntityResolver();
const scorecard = resolver.match(entityA, entityB);

// 3. Build PCA manifest
import { ManifestBuilder } from '@intelgraph/pca-verifier';
const manifest = await ManifestBuilder.buildFromDAG(dag, inputData, executor);

// 4. Store in provenance ledger
await provLedger.store(manifest);
```

### Pattern 2: Policy-Aware Analysis

```typescript
// 1. Load policy
import { PolicyCompiler } from '@intelgraph/policy-compiler';
const compiler = new PolicyCompiler();
const policy = compiler.loadFromYAML(policyYAML);

// 2. Query with policy enforcement
import { GraphRAGCopilot } from '@intelgraph/graphrag-copilot';
const copilot = new GraphRAGCopilot();
copilot.setPolicyRule('SECRET', ['ssn', 'email']);
const response = await copilot.query('Who is Alice?', graphData);

// 3. Audit decision
await auditLogger.log(response);
```

### Pattern 3: Decision Workflow

```typescript
// 1. Hypothesis workbench
import { HypothesisWorkbench } from '@intelgraph/hypothesis-workbench';
const bench = new HypothesisWorkbench();
bench.addHypothesis(h1);
bench.addEvidence(e1);
bench.updateBelief();

// 2. COA planning
import { COAPlanner } from '@intelgraph/coa-planner';
const planner = new COAPlanner();
const simulation = planner.simulate('coa-1', 1000);

// 3. Dialectic debate
import { DialecticAgents } from '@intelgraph/dialectic-agents';
const agents = new DialecticAgents();
const ddr = await agents.debate('Should we proceed?', 5);

// 4. Export disclosure pack
const pack = {
  hypotheses: bench.exportDisclosurePack(),
  coa: simulation,
  debate: ddr,
  provenance: manifest,
};
```

## Testing All Services

```bash
# Run all tests
pnpm test

# Run tests for specific service
pnpm --filter @intelgraph/pca-verifier test
pnpm --filter @intelgraph/zk-deconfliction test
# ... etc
```

## Docker Compose Integration

Add to `docker-compose.dev.yml`:

```yaml
services:
  pca-verifier:
    build: ./services/pca-verifier
    ports: [3101:3101]

  zk-deconfliction:
    build: ./services/zk-deconfliction
    ports: [3100:3100]

  policy-compiler:
    build: ./services/policy-compiler
    ports: [3102:3102]

  graphrag-copilot:
    build: ./services/graphrag-copilot
    ports: [3103:3103]

  # ... add others as needed
```

## Roadmap & Extensions

### Near-term (Q1 2025)
- [ ] Integrate PCA manifests with blockchain/S3 Object Lock
- [ ] Add true ZK-SNARKs to ZK-TX
- [ ] Extend policy compiler to full OPA/Rego
- [ ] Add UI for Hypothesis Workbench
- [ ] Build COA visual planner

### Mid-term (Q2 2025)
- [ ] Multi-party ZK deconfliction
- [ ] Differential privacy in PCA
- [ ] Real-time tri-pane UX updates
- [ ] LLM integration for Dialectic Agents
- [ ] PRD generator with AI assistance

### Long-term (Ascent Beyond)
- [ ] Proof-carrying reality (PCR) integration
- [ ] Quantified coverage metrics for DCQ
- [ ] Federated GraphRAG across tenants
- [ ] Automated COA optimization
- [ ] Full PRD lifecycle automation

## Support & Documentation

Each service has its own README:
- `services/pca-verifier/README.md`
- `services/zk-deconfliction/README.md`
- `services/policy-compiler/README.md`
- `services/schema-ingest-wizard/README.md`
- `packages/entity-resolution/README.md`
- `services/hypothesis-workbench/README.md`
- `services/coa-planner/README.md`
- `services/graphrag-copilot/README.md`
- `packages/tri-pane-ux/README.md`
- `services/dialectic-agents/README.md`
- `services/prd-generator/README.md`

## Contribution Guidelines

When extending these services:
1. **Maintain provenance**: All data transformations must be logged
2. **Respect policies**: Always check authorization before operations
3. **Provide explanations**: Scorecards, citations, and audit trails required
4. **Test thoroughly**: Unit tests + integration tests for all features
5. **Document decisions**: Use DDR pattern for significant choices

## License

Part of Summit/IntelGraph platform. See root LICENSE.

---

**Implemented**: 2025-01-15
**Status**: Production-ready MVP
**Maintainers**: Engineering Team
