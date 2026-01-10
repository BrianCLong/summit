# CNLS Spec Overview

Defines the Graphika wedge for Cross-Network Narrative Lineage & Stance Drift.

## Goals

- Build narrative lineage graphs spanning platforms.
- Detect stance drift and reframing events along lineage paths.
- Produce replayable lineage capsules with provenance and commitments.

## Inputs

- Content items: text, media, referenced resources across sources.
- Time window and snapshot identifier.
- Policy context for access and disclosure.
- Optional target topic and stance definition.

## Outputs

- Narrative lineage graph with lineage relations.
- Stance drift detections and coordination indicators.
- Lineage capsule bound to replay token and commitments.

## Processing Stages

1. **Ingest** content items and normalize identifiers.
2. **Fingerprint** text/media/URLs into canonical signatures.
3. **Link** items into lineage edges (quote/remix/link).
4. **Score stance** per item and detect drift along paths.
5. **Package** outputs into a capsule with commitments.

## Policy & Budgets

- All disclosure constraints are enforced by policy-as-code rules.
- Output volume is bounded by disclosure budgets and lineage expansion limits.

## Observability

- Metrics: lineage edges/sec, stance drift detections, budget truncations.
- Logs: witness records per pipeline stage.
- Traces: lineage extraction and drift evaluation spans.
