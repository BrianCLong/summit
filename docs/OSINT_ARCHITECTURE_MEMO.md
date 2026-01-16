# Recommended OSINT Data Product Architecture for Summit

## Executive Summary

Summit’s mission to provide an AI-augmented intelligence platform requires a robust, scalable architecture for ingesting, fusing, and analyzing Open Source Intelligence (OSINT). Based on the existing "IntelGraph" foundation (Neo4j, Kafka, Microservices, Maestro), this memo recommends an **Event-Driven Microservices Architecture** for the OSINT data product. This approach ensures modularity, real-time processing capabilities, and seamless integration with Summit’s existing graph analytics and AI workflows.

## Recommended Architecture

The proposed architecture leverages Summit's existing technology stack (`IntelGraph`, `Maestro`, `Kafka`) to build a high-fidelity OSINT pipeline.

### 1. Ingestion Layer: Modular Collectors
Instead of a monolithic scraper, we recommend independent **Collector Microservices** for each data source type (e.g., `SocialMediaCollector`, `NewsFeedCollector`, `ThreatIntelCollector`).
*   **Function**: Fetch data from APIs (as defined in `docs/osint-sources.md`), scrape web content, or ingest RSS feeds.
*   **Resilience**: Each collector operates independently; failure in one source does not impact others.
*   **Scalability**: Collectors can be scaled horizontally based on source volume.
*   **Output**: Normalized raw events published to specific Kafka topics (e.g., `ingest.osint.social`, `ingest.osint.threat`).

### 2. Stream Processing & Fusion Layer
A unified **Fusion Service** (extending `battle-ingest` concepts) consumes raw events from Kafka.
*   **Normalization**: Converts disparate source formats into a canonical Summit Schema.
*   **Entity Resolution**: Deduplicates entities (e.g., merging "John Doe" from Twitter and "J. Doe" from a news article) using probabilistic matching.
*   **Enrichment**: Augments data with sentiment analysis, geolocation, and cross-references against existing internal intelligence.
*   **Validation**: Enforces strict schema validation (via `IntelGraph` schema) before persistence.

### 3. Storage Layer: Knowledge Graph & Data Lake
*   **Knowledge Graph (Neo4j)**: Stores high-value, highly structured entities and their relationships (e.g., `Article` -> *MENTIONS* -> `Person` -> *LOCATED_AT* -> `City`). This powers the link analysis and graph AI features.
*   **Data Lake / Document Store (PostgreSQL/S3)**: Stores bulky raw content (full HTML, images, raw JSON responses) for audit trails and re-processing.

### 4. Orchestration & Intelligence
*   **Maestro**: Orchestrates complex, multi-step workflows (e.g., "On new high-priority threat detection, trigger deep-dive collection and notify analyst").
*   **AI Copilot**: Consumes the graph data to generate summaries, answering natural language questions about the OSINT landscape.

## Data Model

The data model should be graph-centric, aligning with the **STIX 2.1** standard where applicable to facilitate interoperability, while extending it for Summit's specific needs.

| Entity Type | Description | Key Attributes | STIX Mapping |
| :--- | :--- | :--- | :--- |
| **Source** | The origin of the information (e.g., Twitter, Reuters). | `name`, `url`, `reliability_score`, `last_polled` | `Identity` |
| **Artifact** | A discrete piece of content (e.g., Tweet, Article, Report). | `content`, `published_at`, `url`, `language`, `sentiment` | `Report` / `Note` |
| **Indicator** | Technical observables (IP, Domain, Hash). | `value`, `type`, `reputation`, `first_seen` | `Indicator` |
| **Actor** | Person, organization, or group. | `name`, `aliases`, `location` | `Threat Actor` / `Identity` |
| **Event** | An occurrence in time. | `description`, `timestamp`, `location` | `Incident` |

**Key Relationships:**
*   `Artifact` *CREATED_BY* `Source`
*   `Artifact` *MENTIONS* `Actor` / `Indicator` / `Event`
*   `Actor` *ASSOCIATED_WITH* `Indicator`

## Integration Points

To ensure the OSINT product delivers value across the Summit ecosystem, the following integration points are critical:

1.  **OSINTFeedService**:
    *   **Role**: The primary entry point for configuring and polling external APIs.
    *   **Integration**: Connects to `KeyVaultService` for credentials and publishes to the Ingestion Layer.
2.  **Maestro Orchestrator**:
    *   **Role**: Manages the lifecycle of intelligence tasks.
    *   **Integration**: Triggers collection jobs based on schedules or events; receives signals from the Fusion Layer to initiate response workflows.
3.  **GraphQL API (Apollo)**:
    *   **Role**: Exposes OSINT data to the frontend and external consumers.
    *   **Integration**: Federation of the OSINT subgraph; provides unified query capabilities for analysts.
4.  **Security & Policy (OPA)**:
    *   **Role**: Enforces access control and data handling policies.
    *   **Integration**: Validates user permissions before returning sensitive OSINT data; filters results based on classification.

## Comparison of Approaches

| Feature | **Recommended: Event-Driven Microservices** | **Alternative: Monolithic Batch ETL** |
| :--- | :--- | :--- |
| **Latency** | **Real-time / Near real-time.** Data is available for analysis seconds after collection. | **High latency.** Data is processed in scheduled batches (e.g., hourly, daily). |
| **Scalability** | **High.** Components scale independently (e.g., scale up Twitter collector during a viral event). | **Low to Medium.** Scaling often requires scaling the entire monolith; bottlenecks are common. |
| **Fault Isolation** | **High.** A crash in one collector does not affect others. Dead-letter queues handle bad data. | **Low.** A failure in one stage can halt the entire pipeline. |
| **Complexity** | **High.** Requires managing distributed systems, queues (Kafka), and eventual consistency. | **Low.** Simpler to develop and deploy initially; easier to reason about state. |
| **Extensibility** | **High.** New sources can be added as new services without touching the core pipeline. | **Medium.** Adding sources requires modifying and redeploying the core application. |
| **Fit for Summit** | **Excellent.** Aligns with Summit's existing distributed, graph-first architecture. | **Poor.** Contradicts Summit's goal of agile, real-time intelligence. |

## References

1.  **Summit Internal Documentation**: `docs/osint-feeds.md`, `docs/osint-sources.md`.
2.  **Ascend.io**: "Data Pipeline Architecture: Understanding What Works Best for Your Use Case" (Discusses modern pipeline patterns).
3.  **Fivecast**: "OSINT Data Fusion: Empowering Intelligence Investigations" (Highlights the importance of fusing diverse OSINT sources).
4.  **Talbot West**: "OSINT + AI: CHAI for open source intelligence fusion" (Describes modular architecture for intelligence).
5.  **OSINT Team**: "Designing Resilient Systems: Microservices Architecture Patterns Explained" (Advocates for decomposition in OSINT systems).
