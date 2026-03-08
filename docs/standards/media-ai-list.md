# Media AI List Standards

## Overview
Media AI List Evaluator (MALE) standardizes the ingestion and evaluation of media-curated AI tool lists (e.g., "Top 10 AI Tools for X").

## Principles
* **Deterministic**: Multiple runs on the same input must produce bit-for-bit identical evidence schemas.
* **Evidence-first**: Claims made by media outlets must be logged as evidence IDs.
* **Deny-by-default**: Tools with unverified claims fail governance checks.

## Interoperability
| Function | Format |
| -------- | ------ |
| Input | URL or Markdown |
| Extraction | Deterministic JSON |
| Evidence | Summit Evidence schema |
| Output | Deterministic JSON |
