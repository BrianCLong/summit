# Influence Defense Method Families (Summit-Native, Defensive Only)

**Readiness Reference:** Summit readiness is asserted under
`docs/SUMMIT_READINESS_ASSERTION.md` and governs this brief's operational posture and evidence
requirements.

## Purpose (Defensive, Lawful, Consent-Based)

This brief defines Summit-native method families for **detecting, attributing, and hardening**
against influence operations while enabling **ethical, voluntary off-ramping**. The scope excludes
coercion, manipulation, or recruitment of real people. All methods are **defensive-only** and must
pass governance gates before action.

## Summit-Native Primitives

Each method maps to Summit’s evidence chain:

**Evidence → Claim → Entity → Relationship → Run (Provenance)**

- **Evidence**: Immutable, cryptographically sealed inputs.
- **Claim**: Atomic assertions extracted with provenance tokens.
- **Entity/Relationship**: Graph nodes/edges with deterministic query plans.
- **Run**: Reproducible, policy-checked execution with model/prompt hashes.

## Method Families (Claim-Shaped Sketches)

### 1) Provenance-First Influence Detection Graph (PFIDG)

**Core idea:** Detect influence campaigns by modeling **provenance-consistent diffusion** rather
than content similarity alone.

**Claim sketch:** A computer-implemented method that (a) ingests multi-source communications,
(b) decomposes them into atomic claims, (c) assigns each claim a provenance identifier bound to
immutable evidence, (d) constructs a propagation graph linking claim identifiers across channels
and time, and (e) computes influence-likelihood based on provenance-consistent diffusion patterns
and transformation signatures.

### 2) Narrative “Change-of-Change” Early Warning (CoC‑EW)

**Core idea:** Detect second-order narrative acceleration and directional shifts to flag influence
operations before peak amplification.

**Claim sketch:** A method that computes first- and second-derivative features over narrative
clusters and triggers alerts when curvature exceeds thresholds under constraints of provenance
completeness and cross-source corroboration.

### 3) Coordination Without Content (CwC) Detector

**Core idea:** Detect coordination when text is obfuscated or multimodal by using temporal and
topological signals.

**Claim sketch:** A method that infers coordinated influence operations by constructing a
multi-layer interaction graph and scoring coordination using non-semantic features (temporal
alignment, repost topology similarity, link co-bursting), where semantic content is optional.

### 4) Trust-Weighted Multi-Graph Fusion With Evidence Completeness (TWMGF)

**Core idea:** Fuse multiple graphs (social, web, registry, infra) while blocking high-confidence
outputs unless evidence completeness meets policy thresholds.

**Claim sketch:** A method that produces influence-risk scores using multi-graph fusion subject to
policy-enforced evidence completeness constraints and reproducible query plans.

### 5) Voluntary Off‑Ramp & Disclosure Workflow (VODW)

**Core idea:** Provide a consent-based, secure path for voluntary disclosure and ethical
disengagement from influence operations.

**Claim sketch:** A method that enables secure voluntary disclosure using staged identity
verification, cryptographic evidence sealing, and governed information release based on policy
thresholds.

## Governance & Determinism Requirements

- **Evidence gating:** No “high-confidence” output without required evidence types.
- **Determinism:** All queries use `ORDER BY`, bounded `LIMIT`s, and reproducible plans.
- **Policy checks:** Every decision object must pass governance gates before export or action.
- **Auditability:** Every conclusion links to a minimal causal envelope of supporting evidence.

## MAESTRO Security Alignment

**MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.  
**Threats Considered:** Prompt injection, goal manipulation, data poisoning, tool abuse,
coordinated timing obfuscation, provenance tampering.  
**Mitigations:** Immutable evidence sealing, deterministic query packs, policy-enforced evidence
completeness, bounded traversal limits, and audit-logged decision objects.

## Implementation Notes (Summit-First)

- **Evidence ledger integration:** Each method writes to the immutable evidence ledger.
- **Reproducible runs:** Run records include model versions, prompt hashes, and query hashes.
- **Policy-as-code:** All thresholds and actions are enforceable via OPA-style policy rules.

## Status

Delivery is governed; follow-up work is **intentionally constrained** until evidence bundles,
policy thresholds, and test plans are aligned with GA gate requirements.
