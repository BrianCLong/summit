# Cognitive Counter-Terrain

## Overview
This document outlines the **Adversarial Narrative Decoy Grid** subsystem within Summit. Analogous to early-warning and decoy hosts in cyber defense (IOFA-style intelligence), Summit deploys synthetic "counter-terrain" to measure, lure, and stress-test adversarial influence tactics entirely internally.

**Crucially, all decoy components remain explicitly synthetic constructs.** They operate strictly in defensive, counterintelligence, and early-warning modes.

## Components

### 1. Decoy Narrative Lattice Model (`summit/decoy_narratives/model.py`)
Defines the `DecoyNarrativeNode`, `DecoyRelation`, and `DecoyLattice`. These are synthetic narrative structures assigned specific threat sensitivity profiles (e.g., `EXECUTIVE_BRAND`, `CRITICAL_INFRA`). Decoy IDs and relationships are explicitly segregated from real ingestion data.

### 2. Decoy-Aware GraphRAG Sandbox (`summit/decoy_narratives/sandbox.py`)
A test-only sandbox environment for loading mixed graphs containing real (scrubbed) and decoy data. Evaluates internal intelligence against early-warning metrics:
* `decoy_attraction_score`: Hit rate on decoy nodes vs. total hits.
* `brittle_dependency_score`: Ratio of paths relying on decoy routes.
* `early_warning_lead_time`: Synthetic approximation of warning thresholds.

### 3. Counter-Terrain Planner (`summit/decoy_narratives/planner.py`)
A defensive advisory component recommending decoy lattice configurations and sandbox scenarios based on current threat intelligence coverage and risk profiles.

## Abuse Analysis & Constraints
These structures could theoretically be misused if someone attempted to push them into live operations or external communications. To prevent this, the system mandates:
1. **Namespacing:** `decoy_id` formats do not intersect with real IDs.
2. **Explicit Tagging:** All decoy structures inherit `is_decoy = True` flags.
3. **Operational Isolation:** Sandbox operations run entirely separated from production graph/RAG workloads.
4. **Advisory Only:** Planning components cannot write state or automatically enforce policy changes.
