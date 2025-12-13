# IntelGraph Repo-Scoped Prompts

> **11 Implementation Prompts for Claude Code**
>
> Advanced features for provenance, safety, cost control, and analyst speed.

## Overview

This directory contains **11 structured prompts** designed to be used with Claude Code for implementing critical IntelGraph features. Each prompt is a complete specification with paths, features, acceptance criteria, and integration points.

### Advisory Committee

These prompts were designed by the IntelGraph Advisory Committee:
- 🪄 **Elara Voss** (Scrum Master)
- 🛰 **Starkey** (OPSEC)
- 🛡 **Foster** (Legal/Policy)
- 📊 **Magruder** (Product)
- 🧬 **Stribol** (Research)
- ⚔ **Oppie** (Chair - Engineering)

---

## Prompt Catalog

### 1. Provenance & Claim Ledger
**File:** `implement.provenance-ledger@v1.yaml`

**Purpose:** Create a provenance ledger microservice with offline verifier for chain-of-custody tracking.

**Key Features:**
- Evidence registration with Ed25519 signatures
- Claim attachment with Merkle trees
- Signed manifest export
- CLI verifier for offline validation
- Tamper detection

**Paths:**
- `services/provenance-ledger/` - Microservice (FastAPI/Go)
- `cmd/prov-verify/` - CLI verifier
- `deploy/helm/provenance-ledger/` - Helm chart

**Done When:**
- ✅ CLI deterministically flags tampering (Exit 3)
- ✅ Merkle proofs verify offline
- ✅ Helm chart renders without errors
- ✅ Threat model documented

**Risk Mitigation:** Chain-of-custody disputes, evidence tampering

---

### 2. Ingest Wizard + Schema-Aware ETL
**File:** `implement.ingest-wizard@v1.yaml`

**Purpose:** Build schema-aware ETL wizard with policy enforcement and automated lineage tracking.

**Key Features:**
- CSV/JSON/XLSX upload with auto-detection
- Field→Entity mapping suggestions
- PII detection and redaction
- License and TOS validation
- DPIA (Data Protection Impact Assessment) checklist
- Export validated job specifications

**Paths:**
- `apps/ingest-wizard/` - Next.js/React wizard
- `packages/policies/` - License & DPIA enforcement
- `workers/ingest/` - Job processor

**Done When:**
- ✅ 10k-row CSV maps in ≤10 minutes
- ✅ License gates block non-compliant data
- ✅ PII detected automatically
- ✅ Lineage tracked from source to Neo4j

**Risk Mitigation:** Policy/ethics breaches, unlicensed data ingestion

---

### 3. NL→Cypher Sandbox
**File:** `implement.nl2cypher-sandbox@v1.yaml`

**Purpose:** Natural language to Cypher query generator with cost preview and safety guardrails.

**Key Features:**
- Natural language question parsing
- Cypher generation with LLM
- Cost/row/time estimation (EXPLAIN)
- Dry-run validation
- Write operation blocking (sandbox mode)
- Query optimization suggestions
- Undo/redo stack

**Paths:**
- `services/nl2cypher/` - Generation service
- `apps/analyst-console/panels/NLQueryPanel.tsx` - UI

**Done When:**
- ✅ 95%+ accuracy on test suite (20+ prompts)
- ✅ Write operations blocked in sandbox
- ✅ Cost estimates shown before execution
- ✅ Dry-run flags expensive queries

**Risk Mitigation:** Cost overruns, accidental data modification

---

### 4. Graph-XAI Counterfactual Explainer
**File:** `implement.graph-xai-explainer@v1.yaml`

**Purpose:** Explainability API for graph analytics with counterfactual reasoning and saliency analysis.

**Key Features:**
- Counterfactual explanations (minimal flips)
- Path rationale analysis
- Feature importance (SHAP, LIME)
- Anomaly explanations
- Provenance-linked citations
- Jupyter notebook examples

**Paths:**
- `services/graph-xai/` - Explainability service
- `apps/analyst-console/panels/ExplainView.tsx` - UI
- `notebooks/examples/` - Jupyter examples

**Done When:**
- ✅ Counterfactuals show minimal change sets
- ✅ Path rationales explain node/edge importance
- ✅ All explanations cite provenance IDs
- ✅ 3 notebook examples execute successfully

**Risk Mitigation:** Black-box analytics, lack of explainability

---

### 5. Proof-Carrying Analytics (PCA) + Wallet
**File:** `implement.pca-wallet@v1.yaml`

**Purpose:** Attestations for materialized results with selective disclosure and verifiable exports.

**Key Features:**
- Signed attestations (Ed25519)
- Complete lineage tracking
- Model cards for ML predictions
- Selective disclosure (ZK proofs)
- Wallet export (W3C Verifiable Credentials)
- External CLI verifier

**Paths:**
- `services/pca/` - Attestation service
- `cmd/pca-verify/` - CLI verifier (Go)
- `apps/analyst-console/export/ProvenanceWallet.tsx` - Export UI

**Done When:**
- ✅ All results have signed attestations
- ✅ Lineage traces to source evidence
- ✅ External verifier reproduces results (±1%)
- ✅ Revocation checking enforced

**Risk Mitigation:** Unverifiable claims, export disputes

---

### 6. Zero-Knowledge Deconfliction
**File:** `implement.zk-deconflict@v1.yaml`

**Purpose:** Multi-tenant overlap detection using ZK proofs without revealing selector values.

**Key Features:**
- Salted hashing (tenant-specific)
- ZK set intersection proofs
- Cardinality range proofs
- Signed transcripts
- Leakage analysis tests

**Paths:**
- `services/zk-deconflict/` - ZK service
- `packages/crypto/` - Cryptographic primitives

**Done When:**
- ✅ Overlap detection without revealing selectors
- ✅ Leakage tests pass (no info leak)
- ✅ Transcripts cryptographically verifiable
- ✅ Constant-time verification

**Risk Mitigation:** Coalition data leakage, selector exposure

---

### 7. Rapid Attribution Runbook Prover
**File:** `implement.attribution-runbook@v1.yaml`

**Purpose:** Encode CTI methodology as replayable DAG with machine-checkable gates.

**Key Features:**
- YAML runbook specification
- DAG execution engine (topological sort)
- Pre/post-execution gates (legal, license, KPI)
- Proof artifact generation
- Signed execution transcripts

**Paths:**
- `services/runbook-prover/` - DAG executor
- `runbooks/rapid-attribution.yaml` - Example runbook

**Done When:**
- ✅ Labeled case runs <30 minutes end-to-end
- ✅ Export blocked if gates fail
- ✅ Proof artifact includes KPIs + citations
- ✅ Runbook is deterministic

**Risk Mitigation:** Policy violations, incomplete attribution

---

### 8. Cost-Guard Query Budgeter
**File:** `implement.cost-guard-budgeter@v1.yaml`

**Purpose:** Budget-aware query planner with cost estimation and automatic slow-query killing.

**Key Features:**
- Query cost estimation (CPU, memory, I/O, network)
- Tenant budget enforcement
- Query optimization (20-40% savings)
- Slow query killer (timeout enforcement)
- Index advisor
- Cost heatmaps

**Paths:**
- `services/cost-guard/` - Budgeting service
- `apps/ops-console/CostHeatmap.tsx` - Visualization
- `benchmarks/graph-queries/` - Benchmark suite

**Done When:**
- ✅ Benchmarks show 20-40% cost reduction
- ✅ Budget limits enforced per tenant
- ✅ Slow queries auto-killed at timeout
- ✅ Alternative plans suggested

**Risk Mitigation:** Cost overruns, budget exhaustion

---

### 9. Offline/Edge Expedition Kit
**File:** `implement.offline-edge-kit@v1.yaml`

**Purpose:** Desktop app for field ops with CRDT sync and conflict-aware merges.

**Key Features:**
- Local SQLite database
- CRDT-based editing (Yjs/Automerge)
- Offline ingest (CSV/JSON)
- Signed sync logs
- Conflict-free merging
- 72-hour disconnected support

**Paths:**
- `apps/edge-kit/` - Desktop app (Tauri/Electron)
- `services/sync/` - Server-side sync

**Done When:**
- ✅ 72-hour disconnected scenario passes
- ✅ Zero data loss on reconnect
- ✅ Merge proofs verify on server
- ✅ Conflicts resolved deterministically

**Risk Mitigation:** Field connectivity loss, data loss

---

### 10. Dissent Ledger + Ombuds Workflow
**File:** `implement.dissent-ledger@v1.yaml`

**Purpose:** Ethics scaffolding with dissent capture, sealed timestamps, and mandatory resolution.

**Key Features:**
- Dissent capture UI
- Risk assessment (low/medium/high/critical)
- Sealed timestamps (RFC3161)
- Ombuds queue for high-risk dissents
- Publish gate (blocks on unresolved dissent)
- Override logging

**Paths:**
- `services/dissent-ledger/` - Dissent service
- `apps/briefing/DissentPanel.tsx` - UI

**Done When:**
- ✅ High-risk actions auto-block until dissent addressed
- ✅ Sealed timestamps immutable
- ✅ Overrides logged with justification
- ✅ Briefs include dissent excerpts

**Risk Mitigation:** Ethical breaches, suppressed concerns

---

### 11. Disinformation Network Mapper
**File:** `implement.disinfo-mapper@v1.yaml`

**Purpose:** Map narratives, detect bursts, trace influence, and simulate counter-messaging COAs.

**Key Features:**
- Narrative detection (DBSCAN clustering)
- Burst analysis (volume spikes)
- Influence modeling (PageRank)
- COA generation (counter-narrative, fact-check)
- Harm risk meters (uplift vs. risk)
- Gradient/flow overlays

**Paths:**
- `apps/disinfo-mapper/` - Mapping console
- `services/narrative-physics/` - Analytics engine

**Done When:**
- ✅ Burst detection with suspiciousness scores
- ✅ Influence paths traced
- ✅ COA selection requires uplift > harm risk
- ✅ Brief export with assumptions + citations

**Risk Mitigation:** Ineffective counter-messaging, amplification

---

## Usage Guide

### How to Use These Prompts

1. **Choose a prompt** from the catalog above
2. **Open the YAML file** (e.g., `implement.provenance-ledger@v1.yaml`)
3. **Paste into Claude Code** or your LLM tool of choice
4. **Set input variables** (e.g., `deployment_target`, `signature_algorithm`)
5. **Execute the prompt** to scaffold files, tests, and documentation

### Input Variables

Each prompt accepts configurable inputs. Example:

```yaml
inputs:
  deployment_target: 'kubernetes'
  signature_algorithm: 'Ed25519'
  storage_backend: 'postgresql'
```

### Example: Using Provenance Ledger Prompt

```bash
# In Claude Code or similar tool:
1. Load: implement.provenance-ledger@v1.yaml
2. Set inputs:
   - deployment_target: "kubernetes"
   - signature_algorithm: "Ed25519"
   - storage_backend: "postgresql"
3. Execute prompt
4. Review generated files in services/provenance-ledger/
5. Run: make test build helm
6. Verify: ./prov-verify tests/golden/sample-bundle.json
```

---

## Acceptance Criteria Matrix

| Prompt | Key Metric | Done When |
|--------|------------|-----------|
| 1. Provenance Ledger | Tamper detection | CLI flags tampering (Exit 3) |
| 2. Ingest Wizard | Processing time | 10k rows in ≤10 min |
| 3. NL→Cypher | Accuracy | ≥95% on test suite |
| 4. Graph-XAI | Explainability | Counterfactuals cite provenance |
| 5. PCA Wallet | Reproducibility | Verifier reproduces ±1% |
| 6. ZK Deconfliction | Privacy | Zero selector leakage |
| 7. Attribution Runbook | Completion time | <30 min for labeled case |
| 8. Cost-Guard | Savings | 20-40% cost reduction |
| 9. Offline Edge Kit | Data loss | Zero loss in 72h offline |
| 10. Dissent Ledger | Ethics enforcement | Blocks publish on unresolved dissent |
| 11. Disinfo Mapper | COA selection | Uplift > harm risk required |

---

## Risk Matrix

| Threat | Likelihood | Impact | Mitigation Prompts |
|--------|-----------|--------|-------------------|
| Chain-of-custody dispute | Medium | Critical | 1 (Provenance), 5 (PCA) |
| Policy/ethics breach | Medium | High | 2 (Ingest), 7 (Runbook), 10 (Dissent) |
| Cost overruns | High | High | 8 (Cost-Guard) |
| Coalition data leakage | Low | Critical | 6 (ZK Deconfliction) |
| Field connectivity loss | Medium | Medium | 9 (Offline Kit) |
| Unverifiable analytics | Medium | High | 4 (Graph-XAI), 5 (PCA) |
| Ineffective counter-messaging | Medium | Medium | 11 (Disinfo Mapper) |

---

## Integration Points

These prompts are designed to integrate with existing IntelGraph infrastructure:

### Shared Services
- **Provenance Ledger** (Prompt 1): Used by 2, 4, 5, 7, 10
- **Audit Service**: Receives logs from all prompts
- **Neo4j**: Primary data store for 3, 4, 11
- **PostgreSQL**: Metadata store for 1, 2, 8, 10

### Data Flow
1. **Ingest** (Prompt 2) → Provenance Ledger (1) → Neo4j
2. **NL Query** (Prompt 3) → Cost-Guard (8) → Neo4j
3. **Analytics** → Graph-XAI (4) → PCA Wallet (5) → Export
4. **Field Ops** → Offline Kit (9) → Sync Service → Server

---

## Development Workflow

### Quick Start

```bash
# 1. Bootstrap environment
make bootstrap

# 2. Choose a prompt and scaffold
# (Example: Provenance Ledger)
cd services/provenance-ledger
make test build

# 3. Verify golden path
./cmd/prov-verify/prov-verify tests/golden/sample-bundle.json

# 4. Deploy
make helm
helm install provenance-ledger deploy/helm/provenance-ledger/
```

### Testing

Each prompt includes comprehensive test requirements:

- **Unit tests**: ≥80% coverage
- **Integration tests**: End-to-end workflows
- **Golden path tests**: Critical scenarios
- **Performance tests**: Meet SLA targets

### CI/CD

All prompts follow IntelGraph CI/CD conventions:

1. **Pre-commit**: Gitleaks, ESLint, Prettier
2. **CI Pipeline**: `make bootstrap && make up && make smoke`
3. **Security**: CodeQL, Trivy, SBOM
4. **Release**: Semantic versioning

---

## Technical Standards

All prompts adhere to IntelGraph conventions (see `CLAUDE.md`):

### Code Style
- **TypeScript**: Strict mode (gradual), ESLint flat config
- **Go**: gofmt, golangci-lint
- **Python**: Black, Ruff

### Architecture
- **Microservices**: FastAPI, Go Fiber
- **Frontend**: React, Next.js, MUI
- **Database**: Neo4j, PostgreSQL, Redis
- **Messaging**: Kafka/Redpanda

### Security
- **Secrets**: Never committed, use env vars or secrets managers
- **Signatures**: Ed25519 for all attestations
- **Encryption**: AES-256-GCM for data at rest
- **Hashing**: SHA-256 (no MD5/SHA-1)

---

## Versioning

Prompts follow semantic versioning:

- **v1**: Initial release
- **v2**: Breaking changes (new inputs, changed outputs)
- **v1.1**: Backward-compatible additions

Current version: **v1** (all prompts)

---

## Contributing

To add or modify prompts:

1. Follow `prompts/schema.json` structure
2. Include:
   - `meta`: id, owner, purpose, tags, guardrails
   - `modelConfig`: model, temperature, maxTokens
   - `inputs`: Configurable parameters
   - `template`: Full implementation guide
   - `examples`: At least 2 usage examples
3. Validate: `pnpm validate-prompts`
4. Test: Execute prompt and verify output
5. Document: Update this README

---

## Support

For questions or issues:

- **Documentation**: `docs/ARCHITECTURE.md`, `docs/DEVELOPER_ONBOARDING.md`
- **Issues**: https://github.com/BrianCLong/summit/issues
- **Slack**: #intelgraph-dev

---

## License

These prompts are part of the IntelGraph platform and are subject to the project's license.

---

**End of Repo-Scoped Prompts README**

*Last Updated: 2025-11-22*
*Advisory Committee: Elara, Starkey, Foster, Magruder, Stribol, Oppie*
