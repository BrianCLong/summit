---
title: ZIP Export & Certification
summary: How to export and verify certified ZIP archives.
version: latest
owner: docs
---

## Format Specification

## Sample

## Verification Flow

```mermaid
flowchart TD
  A[User requests ZIP] --> B{Sign & bundle}
  B -->|OK| C[Emit artifact + manifest]
  C --> D[Verifier checks signature & manifest]
  D --> E{Certified?}
  E -->|Yes| F[Accept]
  E -->|No| G[Reject + report]
```
