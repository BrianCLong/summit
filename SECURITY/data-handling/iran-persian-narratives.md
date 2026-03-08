# Data Handling: Iran Persian Narratives

## Classification
- Public-source content: Retained as evidence refs.
- Derived analytic metadata: Processed through IntelGraph.
- Sensitive operational annotations: Encrypted at rest.

## Retention
- Keep raw public-source references.
- Retain hashes/signatures and evidence pointers longer than media blobs.
- Separate deterministic fixtures from live-source caches.

## Never Log
- Analyst credentials
- Private API secrets
- Raw access tokens
- Exact user query text if it includes protected hypotheses
