# Data Handling: AI Influence Campaign Ontology

## Overview
This document specifies the security, classification, and data retention rules surrounding the AI Influence Campaign ontology and its test fixtures within Summit.

## Classification
- For initial deployment (MWS), all tracked influence ops models and fixtures must contain **public OSINT data only**.
- Analytical metadata derived from the ontology is considered internal property but carries low risk if exposed without PII.
- Special-category personal data is strictly forbidden in campaign fixtures.

## Retention
- Fixtures and generated artifacts are maintained within the version control repository.
- External evidence links must not be included directly in deterministic JSON without corresponding generic normalizations (use the ID pattern: `EVID:ai-influence-campaign:evidence:000X`).

## Never-Log Rules
- Raw auth tokens
- User session identifiers
- Scraped private messages
- Unredacted personal contact information
- Prompts that generate confidence rationales
