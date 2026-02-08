# OSINT Second-Order Awareness Standard

## 1. Overview
This standard defines the methodology for moving from first-order detection ("what changed") to second-order awareness (rate of change, inflection points, context lineage).

## 2. Artifacts & Evidence
All artifacts must be deterministic and schema-validated.

### 2.1 Inflection Metrics
- **File:** `inflection.metrics.json`
- **Purpose:** Tracks derivatives of change.

### 2.2 Context Lineage
- **File:** `context.lineage.json`
- **Purpose:** Captures adjacent content (recommendations, replies) with privacy-aware redaction.

### 2.3 Summaries with Deltas
- **File:** `summary.json`
- **Purpose:** Summaries that explicitly list context omissions and reorderings.

### 2.4 Assumptions Registry
- **File:** `assumptions.json`
- **Purpose:** Tracks assumptions and triggers reruns upon invalidation.

## 3. Privacy & Security
- **Deny-by-default:** All context fields are denied unless allowlisted.
- **Redaction:** PII must be redacted before storage.
- **No unstable timestamps:** Artifacts must be diffable.
