# Standard: CTI Briefing - Cloud & Supply Chain

## 1. Overview
**Slug**: `cti-briefing-cloud-supplychain`
**Goal**: Deterministic CTI→Controls pipeline for Mustang Panda, Open Source, and AI threats.

## 2. Import/Export Matrix

### Imports
* **Source URLs**: Tech blog HTML, PDFs (high-signal sources).
* **Local Fixtures**: For offline testing and deterministic verification.

### Exports
* **`report.json`**: Claims, extracted snippets, mapped controls.
* **`metrics.json`**: Counts by category (supply-chain, cloud, exploitation, AI-misuse).
* **`stamp.json`**: Deterministic content hash + Evidence IDs.
* **`policy-findings.json`** (Optional): For CI annotations.

### Non-goals
* Full web crawling.
* IOC enrichment at internet scale.
* Automatic blocking actions.

## 3. Data Handling
* **Classification**: Public CTI snippets.
* **Never-Log**: Auth headers, cookies, tokens, PII.
* **Retention**: Ephemeral CI artifacts.

## 4. Determinism
* No timestamps in output artifacts.
* Stable key ordering in JSON.
* Content-based hashing.

## 5. Automation & drift
* Scheduled ingestion flagged OFF by default.
* Drift detection compares `metrics.json` across runs.
