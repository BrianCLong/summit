# Info Warfare Narrative Graph Architecture

## 1. Overview
The Narrative Graph is a specialized projection of the IntelGraph data model focused on detecting, characterizing, and tracking information operations (IO) and disinformation campaigns.

## 2. Core Ontology

### 2.1 Nodes
- **Narrative**: A central theme or story arc (e.g., "Election fraud narrative").
- **Claim**: A specific assertion within a narrative (e.g., "Votes were stolen in City X").
- **Actor**: An entity (individual, group, or state-actor) responsible for disseminating or amplifying narratives.
- **Platform**: A social media platform, news outlet, or messaging app where narratives are disseminated.
- **Event**: A real-world event that triggers or is coupled with a narrative.
- **Artifact**: A specific piece of content (image, video, deepfake, document) supporting a claim.
- **Regulation**: A legal or policy constraint affecting the dissemination of narratives (e.g., DSA, labeling requirements).

### 2.2 Edges
- **AMPLIFIES**: An `Actor` or `Platform` increases the visibility of a `Narrative` or `Claim`.
- **REFERENCES**: A `Narrative` or `Claim` cite an `Event` or `Artifact`.
- **TARGETS**: A `Narrative` or `Actor` focuses on a specific demographic, organization, or person.
- **COUPLED_WITH**: A `Narrative` is linked to a physical-world event or action.
- **EVIDENCED_BY**: A `Claim` or `Narrative` is supported by an `Evidence` ID.

## 3. Data Flow
1. **Ingestion**: RSS, CSV, or REST connectors ingest raw observations.
2. **Extraction**: AI agents extract entities and relationships based on the ontology.
3. **Graph Construction**: Entities are upserted into Neo4j with deterministic logic.
4. **Scoring**: Narratives are scored for reach, impact, and confidence.
5. **SITREP Generation**: Periodic SITREPs are generated from the graph state with full evidence auditability.

## 4. Governance Guardrails
- **Deny-by-Default**: Claims without associated evidence IDs are flagged as hypotheses only.
- **Never-Log**: Raw PII and doxxing strings are redacted before being stored in the graph.
- **Confidence Labeling**: Every narrative node must carry a confidence score (0.0–1.0).
- **Auditability**: All graph modifications are logged in the structured audit trail.
