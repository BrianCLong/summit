# Engineering Intelligence Network (EIN)

The Engineering Intelligence Network (EIN) expands Summit from single-repository learning to
cross-repository architecture intelligence. EIN ingests repository-level architecture signals,
builds global datasets, detects ecosystem patterns, and updates deterministic learning models.

## Scope

EIN is intentionally deterministic and evidence-first:

- Input signals are gathered from git metadata, dependency manifests, CI workflows, and architecture
  topology proxies.
- Each repository is represented as:
  - Repository State Graph
  - Repository Knowledge Graph
- Global outputs are persisted under `.global-intelligence/`.
- Learning artifacts include evidence-ledger linkage so generated models can be traced to source
  graphs.

## Pipeline

1. `scripts/network/repository-ingestion-engine.mjs`
   - Discovers repositories (`.global-intelligence/repositories.json` manifest optional).
   - Extracts commit, dependency, CI, refactor, and architecture metrics.
   - Emits `.global-intelligence/repository-dataset.json`.
2. `scripts/network/global-pattern-detector.mjs`
   - Aggregates cross-repository patterns:
     - dependency topology
     - architecture stability proxies
     - refactor intensity
     - technology adoption trends
   - Emits `.global-intelligence/global-patterns.json`.
3. `scripts/network/network-learning-engine.mjs`
   - Produces deterministic learning model updates for:
     - stability predictor
     - evolution simulator
     - architecture optimizer
     - innovation detection
   - Emits `.global-intelligence/network-learning-models.json`.
   - Emits `.global-intelligence/evidence-ledger-entry.json` for Evidence Ledger integration.
4. `scripts/network/network-intelligence-report.mjs`
   - Produces final network intelligence report artifact:
     - `.global-intelligence/engineering-intelligence-network.json`

## Artifact Contracts

### Repository dataset

- Path: `.global-intelligence/repository-dataset.json`
- Contains repository-level state/knowledge graph records and evidence fingerprints.

### Network report

- Path: `.global-intelligence/engineering-intelligence-network.json`
- Output fields:

```json
{
  "repositories_analyzed": 0,
  "architecture_patterns": [],
  "dependency_growth_models": [],
  "refactor_success_models": [],
  "technology_trends": []
}
```

## CI integration

Workflow: `.github/workflows/engineering-intelligence-network.yml`

- Runs weekly (`0 4 * * 1`) and on demand.
- Generates the full EIN artifact chain.
- Uploads all `.global-intelligence` artifacts as a workflow artifact.

## Local execution

```bash
node scripts/network/repository-ingestion-engine.mjs
node scripts/network/global-pattern-detector.mjs
node scripts/network/network-learning-engine.mjs
node scripts/network/network-intelligence-report.mjs
```

## Governance and MAESTRO alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats considered**: prompt injection via untrusted repo manifests, malicious dependency names,
  evidence tampering.
- **Mitigations**:
  - deterministic sorting and serialization
  - hash-based evidence fingerprints
  - explicit evidence chain artifacts
