# RegIntel Architecture

## 1. Overview
The Regulatory Intelligence (RegIntel) pipeline automates the ingestion, extraction, and compliance mapping of regulatory updates (e.g., EU AI Act, FedRAMP, CMMC). It is designed to be deterministic, audit-ready, and capable of running in offline/air-gapped environments.

## 2. Core Components

### 2.1 Sources (`summit/regintel/sources/`)
- **Connectors**: Python modules responsible for fetching content from authoritative sources (EUR-Lex, FedRAMP.gov, Federal Register).
- **SourceSnapshot**: A normalized data structure capturing the raw content, hash, timestamp, and canonical URL.
- **Mirroring**: All sources must support an `offline_mode` where data is read from a local, content-addressable mirror (`data/mirrors/`) validated by a `mirror_manifest.jsonl`.

### 2.2 Extraction (`summit/regintel/extract/`)
- **Deterministic Extractors**: Rule-based or regex-based logic to extract specific facts (dates, obligations, thresholds).
- **LLM-Augmented Extraction**: (Optional/Gated) Used only for summarization or unstructured text, with strict schema enforcement and no tool execution.

### 2.3 Compliance Graph (`summit/regintel/graph/`)
- Maps extracted Facts to:
    - **Obligations**: What must be done.
    - **Controls**: How we do it.
    - **Evidence**: What proves we did it.
- Supports multi-tenant and region-specific views.

### 2.4 Evidence Emission (`summit/regintel/evidence/`)
- Every pipeline run produces an immutable Evidence Bundle in `artifacts/evidence/<EID>/`.
- **EID Pattern**: `regintel/<item_slug>/<git_sha>/<pipeline_name>/<run_sequence>`
- **Artifacts**:
    - `report.json`: The extracted facts, deltas, and risk scores.
    - `metrics.json`: Evaluation metrics (precision, recall, coverage).
    - `stamp.json`: Metadata (commit SHA, timestamps, offline status).

## 3. Data Flow

1.  **Ingest**: Connectors fetch data -> produce `SourceSnapshot` objects.
2.  **Verify**: Hashes checked against manifest (if offline) or recorded (if online).
3.  **Extract**: Extractors process snapshots -> produce `Fact` objects.
4.  **Graph**: Facts mapped to the Compliance Graph nodes.
5.  **Diff**: Current graph state compared to previous -> produce `Delta` objects.
6.  **Emit**: `report.json` and other artifacts written to disk.

## 4. Offline / Air-gapped Mode
- **Constraint**: No outbound network calls allowed in `offline_mode=True`.
- **Mechanism**:
    - "Mirror Packs" containing raw HTML/PDFs and a manifest are distributed to the environment.
    - Connectors are instantiated with `mirror_root` path.
    - `fetch()` reads from disk and verifies `content_sha256` matches the manifest.

## 5. Security
- **Untrusted Input**: All external content is treated as untrusted.
- **Sandboxing**: Parsers run with restricted permissions.
- **Prompt Injection**: No LLM tool execution on source text.

## 6. Directory Structure
```
summit/regintel/
├── evidence/       # Schemas and emitters
├── sources/        # Connectors and snapshot models
├── extract/        # Extraction logic
├── graph/          # Graph mapping logic
├── diff/           # Delta calculation
├── emitters/       # Ticket/PR generation
├── models/         # Internal data models
└── evals/          # Evaluation suites (GFEB, RGAB)
```
