# SIGINT Platform Architecture

## Overview
The SIGINT module provides advanced Signal Intelligence capabilities including collection, classification, analysis, and exploitation of Radio Frequency (RF) signals. It is designed as a modular, scalable system integrated into the core IntelGraph platform.

## Core Components

### 1. Ingestion Layer (`SignalCollectionService`)
- **Responsibility:** Normalizes raw RF data (metadata, I/Q snippets) into standard `Signal` objects.
- **Input:** JSON payloads via REST API (simulated) or potentially direct stream ingestion.
- **Output:** Normalized `Signal` domain objects.

### 2. Analysis Pipeline (`SigIntManager`)
The Manager orchestrates a linear pipeline of stateless analysis services:
- **Classification:** `SignalClassificationService` determines signal type (Radar, Comms) and Threat Level based on frequency bands and modulation.
- **Spectrum Analysis:** `SpectrumAnalysisService` detects LPI/LPD behaviors like Frequency Hopping and Jamming/Interference using historical context.
- **Geolocation:** `GeolocationService` computes lines of bearing (LOB) or TDOA fixes.
- **Decryption:** `DecryptionService` handles COMINT extraction (simulated).

### 3. Persistence Layer (`SigIntRepository`)
- **Primary Store (Postgres):**
  - `sigint_signals`: Immutable log of all intercepted events.
  - `sigint_emitters`: Mutable state of tracked entities (Electronic Order of Battle).
- **Graph Store (Neo4j):**
  - Projections of Emitters and Signals are synced to the graph to enable link analysis (e.g., `(Emitter)-[:EMITTED]->(Signal)`).

### 4. Telemetry
- Integrated with `ComprehensiveTelemetry` to track:
  - Ingestion rates (`sigint_signals_ingested_total`)
  - Detection events (`sigint_jamming_events_total`)
  - Processing latency histograms.

## Data Flow

1. **Ingest:** `POST /api/sigint/ingest` receives raw data.
2. **Process:** `SigIntManager` enriches data through analysis services.
3. **Contextualize:** Manager queries `SigIntRepository` for recent history (to detect hopping/jamming).
4. **Persist:**
   - Signal logged to Postgres.
   - Emitter state updated (last seen, freq range).
   - Nodes/Edges synced to Neo4j.
5. **Respond:** Enriched Signal object returned to caller.

## Integration Points
- **API:** Exposed via `server/src/routes/sigint.ts`.
- **Graph:** Nodes labeled `:Signal` and `:Emitter`.
- **Monitoring:** Metrics exposed via standard Prometheus endpoint.
