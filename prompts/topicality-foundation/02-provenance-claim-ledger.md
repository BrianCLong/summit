# Prompt 2: Provenance & Claim Ledger Library

**Tier:** 0 - Foundation
**Priority:** ⭐️ CRITICAL PATH
**Effort:** 1 week
**Dependencies:** Prompt 1 (IntelGraph Core)
**Blocks:** Prompts 3, 5, 6, 8, 10

---

You are Claude Code, an AI software engineer working for Topicality.

Context:
- Every important output in Topicality should have a "claim ledger" with provenance.
- We want a reusable library that services can use to record claims + provenance in a consistent way and push them into IntelGraph (or a local store for now).
- Provenance beats persuasion: logging and evidence are first-class.

Goal:
Implement a small, self-contained "claim ledger" library that:
1) standardizes claim objects,
2) attaches provenance and policy labels,
3) writes to a backend (IntelGraph API or a stub),
4) can emit a machine-readable manifest (JSON/YAML).

Assumptions:
- Same language as Prompt 1 OR a language that can integrate easily. If Prompt 1 is unknown, choose TypeScript/Node.
- Treat IntelGraph as an HTTP API with a base URL; provide a configurable client.

Requirements:
1. Claim object
   - Fields: claim_id, entity_id, property, value, timestamp, actor (who created it), status (draft/verified/deprecated).
2. Provenance object
   - Fields: sources (list with URL or doc_id + content_hash), ingestion_pipeline, manual/automated, confidence, notes.
3. Policy labels
   - origin, sensitivity, legal_basis (enumerated values).
4. Library features
   - Functions to create, validate, and serialize claims + provenance + policy labels.
   - Function to submit to:
     - remote IntelGraph endpoint, OR
     - local file store or in-memory store (for dev/testing).
   - Ability to emit a "claim ledger manifest":
     - a JSON/YAML object listing all claims and provenance for a given run_id or artifact.

5. Developer ergonomics
   - Provide clear TypeScript/Python types.
   - Include examples:
     - Creating a claim for "system X has SLO_uptime 99.95% for Q1".
     - Attaching provenance from a metrics database + dashboard screenshots (represented as content hashes/links).
   - Include tests validating schema and round-trip serialization.

Deliverables:
- Library code with types.
- Simple IntelGraph client stub (configurable endpoint).
- Examples folder.
- Tests and README.

Work in phases: design → types → core logic → backend client → examples → tests → docs.
