# Aurelius MVP Architecture

## Overview
Aurelius is the IP harvesting and novelty analysis engine. It extracts concepts from text and assesses their novelty against a prior art database.

## Components

### Idea Extraction Pipeline
- **Concept Extraction**: Deterministic keyword extraction.
- **Novelty Scoring**: Heuristic scoring based on keyword overlap (mocked).
- **Draft Generation**: Auto-generates claims and abstracts.

### Integration
- **Maestro**: Can be triggered as a Task (`IP_GENERATION`).
- **Governance**: Ensures no disallowed domains (e.g., bio-weapons) are processed.
