# Data Classification & Retention: Summit CLI

This document outlines the data handling policy for the Summit CLI, specifically concerning agent traces and deterministic artifacts.

## Never Log
- Raw prompts
- Source repo secrets
- Tokens/credentials
- Unsigned bundle contents from private repos
- Unstable timestamps inside deterministic artifacts

## Allowed Logs
- Command name
- Agent id
- Success/failure code
- Deterministic duration buckets
- Trace ids

## Retention Policy
- Local dev traces: Configurable, default 7 days
- CI metrics artifacts: 30 days
- Deterministic build artifacts: Retained per release policy
