# Information Supply Chain Lifecycle Model

## "From Raw Signals to Trusted Knowledge"

This document defines the **canonical seven-stage information lifecycle** for Summit. Every artifact, signal, and inference must live somewhere in this chain. This lifecycle is non-negotiable doctrine.

### The 7-Stage Lifecycle

1.  **Source** – Where information originates.
2.  **Ingest** – How it enters the system.
3.  **Normalization** – How it is made comparable.
4.  **Enrichment** – How context is added.
5.  **Assessment** – How trust and confidence are assigned.
6.  **Utilization** – How it influences decisions.
7.  **Decay / Retirement** – How it loses relevance or is revoked.

---

### 1. Source (Origin)
*   **Definition**: The external or internal point of origin for a piece of data.
*   **Key Metadata**:
    *   `source_id`: Unique identifier (e.g., `src_twitter_v1`, `user_123`).
    *   `source_type`: `first_party`, `third_party_api`, `public_scrape`, `human_assertion`.
    *   `authentication_status`: `authenticated`, `anonymous`, `verified`.
*   **Goal**: Establish the "ground truth" pedigree.

### 2. Ingest (Entry)
*   **Definition**: The mechanism by which data crosses the system boundary.
*   **Key Metadata**:
    *   `ingest_timestamp`: Precise time of entry.
    *   `ingest_method`: `webhook`, `poll`, `upload`, `stream`.
    *   `raw_hash`: SHA-256 of the raw payload before any processing.
*   **Goal**: Capture the raw signal immutably.

### 3. Normalization (Standardization)
*   **Definition**: Converting raw data into the Summit canonical schema.
*   **Actions**:
    *   Timestamp unification (UTC).
    *   Entity resolution (mapping strings to IDs).
    *   Format conversion (JSON standardization).
*   **Goal**: Make disparate data comparable.

### 4. Enrichment (Contextualization)
*   **Definition**: Augmenting normalized data with derived context.
*   **Actions**:
    *   Geolocation lookup.
    *   Sentiment analysis.
    *   Cross-referencing with existing Knowledge Graph.
*   **Goal**: Add value without altering the original signal.

### 5. Assessment (Trust & Confidence)
*   **Definition**: Evaluating the reliability and quality of the information.
*   **Metrics**:
    *   `confidence_score` (0.0 - 1.0).
    *   `trust_tier` (`unverified`, `provisional`, `trusted`, `authoritative`).
    *   `verification_status`.
*   **Goal**: Quantify risk before usage.

### 6. Utilization (Action)
*   **Definition**: The consumption of information by agents, models, or humans to make decisions.
*   **Tracking**:
    *   `consumed_by`: Agent or service ID.
    *   `decision_id`: Trace ID of the decision made.
    *   `impact_score`: Weight of this information in the decision.
*   **Goal**: Trace accountability.

### 7. Decay / Retirement (End of Life)
*   **Definition**: The structured degradation of trust over time or explicit revocation.
*   **States**:
    *   `active`: Fully trusted.
    *   `stale`: Trust degraded by time.
    *   `archived`: No longer used but kept for audit.
    *   `revoked`: Explicitly invalidated (e.g., source compromised).
*   **Goal**: Prevent "zombie facts" from polluting decisions.
