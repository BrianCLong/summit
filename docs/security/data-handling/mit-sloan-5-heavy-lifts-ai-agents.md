# Data Handling: MIT Sloan 5 Heavy Lifts

This document outlines the data handling requirements for AI agents based on the "5 Heavy Lifts" framework from MIT Sloan.

## Data Integration (CLAIM-01)
Consistent data pipelines and serving infrastructure are required for any agentic deployment.

## Data Classification
All data consumed or produced by agents must be classified.
- **Internal**: Standard operational data.
- **Confidential**: Sensitive business data, requiring higher oversight.
- **Restricted**: Mission-critical data, requiring human-in-the-loop for any mutation.

## Retention
- Metrics: 90 days.
- Drift reports: 180 days.

## Privacy
- Never log API keys.
- Never log user PII.
- Never log internal model prompts unless they are part of a governed evidence bundle.
