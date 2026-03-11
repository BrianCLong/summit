# Counterintelligence Architecture Map

## Commander’s Intent
This document provides a precise, implementation-grounded map of Summit’s narrative intelligence and actor tracking flows. Its purpose is to support future defensive counterintelligence work by identifying where adversarial-asset tracking, tripwires, and detection mechanisms can be integrated without disrupting existing runtime behavior.

## Overview
Summit’s narrative intelligence architecture is built on a modular ingestion and simulation pipeline. Narratives, actors, and campaigns are ingested via external connectors, normalized into a canonical domain model, enriched with behavioral and linguistic signals, and surfaced to analysts for investigation.

## Data Flows

### 1. Ingestion & Normalization
- **Source:** \`server/src/ingest/orchestrator.ts\` (\`PipelineOrchestrator\`)
- **Process:** Data is fetched via \`SourceConnector\` implementations (e.g., \`FileSourceConnector\`, \`HttpSourceConnector\`).
- **Normalization:** \`server/src/ingest/stages/normalization.ts\` (\`NormalizationStage\`) converts raw records into canonical \`Entity\` and \`Document\` types defined in \`server/src/data-model/types.ts\`.
- **Target:** Normalized data is passed to enrichment stages.

### 2. Enrichment & Signal Detection
- **Process:** \`server/src/ingest/stages/enrichment.ts\` (\`EnrichmentStage\`) orchestrates various enrichers.
- **Signal Detection:** \`server/src/cognitive-security/campaign-detection.service.ts\` (\`CampaignDetectionService\`) identifies coordinated behavior:
    - **Temporal Synchrony:** Detects bursts of activity within tight time windows.
    - **Content Reuse:** Identifies cross-account sharing of identical content.
    - **Phrasing Fingerprints:** Stylometric analysis of narrative content.
    - **Network Anomalies:** Identifies unusual clustering in actor-channel graphs.
- **Scoring:** Risk scores are derived from coordination confidence and threat level heuristics.

### 3. Narrative Simulation & Tracking
- **Process:** \`server/src/narrative/manager.ts\` (\`NarrativeSimulationManager\`) manages simulation state.
- **Engine:** \`server/src/narrative/engine.ts\` (\`NarrativeSimulationEngine\`) tracks entity dynamics (influence, sentiment, volatility) and story arcs.
- **Output:** Simulation state is used for forecasting and "what-if" analysis of narrative evolution.

### 4. Analyst Surfaces
- **Surfaces:** Analyst dashboards and command centers (e.g., \`live-command-center.html\`).
- **Interaction:** Analysts can override scores, flag entities, and trigger manual investigations.

## Trust Boundaries & Adversarial Risk

| Boundary | Description | Adversarial Risk |
| --- | --- | --- |
| External Ingest | Connectors fetching data from external platforms. | **Input Poisoning:** Injecting malicious or misleading narratives to skew detection. |
| Model Outputs | LLM-generated summaries and classifications. | **Masquerading:** Adversaries tailoring content to appear benign or bypass heuristics. |
| Analyst Interaction | Points where human analysts review and label data. | **Manipulation:** Tricking analysts into dismissing genuine threats or flagging benign actors. |
| Scoring Logic | Automated risk assessment in \`CampaignDetectionService\`. | **Score Manipulation:** Exploiting known detection thresholds to stay under the radar. |

## Counterintelligence Hooks

Future CI mechanisms can be attached at these identified "hooks":

- **Detection Hooks:** Inside \`CampaignDetectionService.runDetectionPipeline()\` for integrating new adversarial-asset detection logic.
- **Tripwire Hooks:** Within \`NormalizationStage\` to flag assets matching known adversarial signatures (e.g., handles, source IDs).
- **Tracking Hooks:** In \`NarrativeSimulationEngine.tick()\` to monitor the evolution of \`AdversarialAsset\` engagement states.
- **Audit Hooks:** Within the \`PipelineOrchestrator\` to log every step of an asset's lifecycle for defensive attribution.

## Diagrams

### Major Flow
\`\`\`
Ingestion (Connectors)
  --> Normalization (NormalizationStage)
    --> Enrichment (EnrichmentStage)
      --> Campaign Detection (CampaignDetectionService)
        --> Narrative Simulation (NarrativeSimulationEngine)
          --> Analyst Surfaces (Dashboards)
\`\`\`

### CI Hook Integration
\`\`\`
[Ingest] -> [Normalization] -> [Enrichment] -> [Campaign Detection]
               ^                  ^                ^
               |                  |                |
         [CI Tripwires]     [CI Detections]   [CI Asset Tracking]
\`\`\`

## Assumptions & Gaps
- **Assumption:** The \`CampaignDetectionService\` is the primary locus for multi-signal coordination analysis, and adding CI-specific signals there is the most idiomatic approach.
- **Assumption:** \`Entity\` properties in \`server/src/data-model/types.ts\` are flexible enough to hold initial CI metadata without schema changes.
- **Gap:** Real-time feedback loops from the \`NarrativeSimulationEngine\` back into the ingestion pipeline for proactive defensive measures are currently conceptual and not fully implemented.
- **Gap:** The exact mechanism for "turning" a monitored asset into a sensor is not yet defined in the current runtime logic.
