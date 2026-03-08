# ADR 003: Evidence Store Choice

## Context
We need content-addressed storage for deterministic bundles, supporting local mode (air-gap) and cloud mode.

## Decision
We will use an S3-compatible API interface. In production, this maps to AWS S3. In local/air-gapped deployments, this maps to **MinIO**.

## Rationale
S3 API is ubiquitous. MinIO provides a lightweight, exact API match for local and air-gapped deployments, ensuring no code changes between environments.
