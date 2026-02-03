# ADR-007: Ingest Staging and Air-Gap Gateway

- **Status:** Proposed
- **Date:** 2025-12-05
- **Owner:** Data / Platform Team

## 1. Context

Summit ingests data from a variety of sources:

- Files (CSV, STIX/TAXII, JSON)
- OSINT / web scrapers
- Possibly model outputs (transcriptions, summaries, extractions)

Today, external data paths and internal data paths are not clearly separated in a way that:

- Guarantees **no untrusted payload** touches core databases directly.
- Prevents ingest code from having **direct internet egress and DB access** in the same process.
- Avoids anti-patterns in orchestration (e.g. massive blobs passed via Airflow XCom).

We need to:

- Control ingestion quality.
- Defend against data poisoning and malicious payloads.
- Avoid stability issues at higher ingest rates.

## 2. Decision

We will introduce a **two-stage ingress model** with explicit “dirty” and “clean” zones, plus a Kafka/Redpanda buffer for high-velocity feeds:

1. **Dirty Zone** (untrusted):
   - Scraper containers and external connectors can:
     - Fetch data from the internet / external systems.
     - Write raw output to a **Dirty Bucket** (S3/MinIO filesystem).

2. **Sanitizer / Gateway**:
   - Stateless worker or Lambda functions that:
     - Read from Dirty Bucket.
     - Perform MIME validation based on magic bytes.
     - Strip HTML tags and control characters.
     - Validate JSON against strict schemas (e.g., Zod/Pydantic).
   - Write validated, normalized output to a **Clean Bucket**.

3. **Clean Zone** (trusted loader services):
   - Loader services are:
     - Not allowed to access the internet.
     - Allowed only to read from Clean Bucket and write to internal DBs (Neo4j/Postgres/Timescale).
   - High-velocity streams pass through Kafka/Redpanda:
     - Sanitized messages are written to topics.
     - Loader consumers process in controlled batches.

## 3. Rationale

- **Security**  
  Prevents direct coupling between internet-facing code and core data stores; reduces blast radius for scraper compromises.

- **Robustness**  
  Decouples ingest rates from DB availability, while making backpressure explicit via Kafka.

- **Clarity & compliance**  
  Makes it possible to reason about what transformations happened to external data before it touched internal systems.

## 4. Implications

### 4.1 On deployment

- We need at least:
  - Dirty object storage (folder/bucket).
  - Clean object storage.
  - Sanitizer service (function or container).
  - Loader service.
  - Kafka/Redpanda cluster for high-velocity use cases.

### 4.2 On code

- Scrapers will:
  - Lose direct access to DBs.
  - Write to Dirty Bucket only.
- Sanitizers will:
  - Implement strict JSON schemas and sanitization.
  - Run as independent, horizontally scalable workers.
- Loaders will:
  - Become the only code paths allowed to write into IntelGraph data stores for external data.
  - Optionally use entity resolution (ADR-001) before inserting/updating.

### 4.3 On Airflow (or equivalent orchestration)

- DAGs should:
  - Pass references (bucket keys, Kafka offsets) via XCom, not large JSON blobs.
  - Coordinate sanitizer/loader tasks instead of doing heavy ETL inline.
- This should reduce memory/DB pressure and simplify scaling.

## 5. Alternatives Considered

1. **Direct DB writes from scrapers**
   - Simplest in the short term.
   - High security and stability risk; not acceptable for target use-case.

2. **A single monolithic “ingest service” handling everything**
   - Blends internet access, parsing, validation, and DB writes.
   - Hard to secure and scale; large blast radius for bugs or attacks.

3. **Fully managed ETL (e.g. commercial pipelines)**
   - Could offload some complexity but introduces external dependencies and costs.
   - Still doesn’t solve IC-specific air-gap requirements.

## 6. Rollout Plan

- Phase 1:
  - Define schemas for the most important ingest payloads.
  - Implement sanitizer for one or two critical sources.
  - Wire loaders to Clean Bucket for those sources.
- Phase 2:
  - Extend pattern to remaining scraping/ingest flows.
  - Introduce Kafka for sources with bursty or high volume.
- Phase 3:
  - Document `docs/INGESTION.md` with diagrams and expectations.
  - Add tests that assert:
    - No scraper code imports DB clients.
    - Loader services fail fast on dirty payloads.

## 7. Open Questions

- Which object storage abstraction do we standardize on (S3-compatible everywhere vs local/minio-only for dev)?
- How do we handle non-JSON payloads (images, PDFs) in the sanitizer?
- Where should trust scores be assigned: at sanitizer, loader, or a dedicated “source assessment” service?
