# Threat Model: Influence Ops

## MAESTRO Layers

- Foundation
- Data
- Agents
- Tools
- Infrastructure
- Observability
- Security

## Threats Considered

- Goal manipulation via adversarial narrative injection
- Prompt/tool abuse in collection and enrichment workflows
- Attribution overreach without review
- Privacy over-linkage during entity resolution
- Cross-tenant data leakage
- Model/artifact supply-chain tampering

## Mitigations

- Policy-as-code gates for attribution and identity resolution exports
- Mandatory provenance metadata on nodes, edges, and derived hypotheses
- Default-safe feature flags for privacy-sensitive enrichers
- Signed playbooks, models, and connector manifests with verifiable hashes
- Tenant-scoped storage, compute, and cache boundaries
- Audit hooks on every high-risk transition and export action

## Residual Risk

- Collection legality and ToS interpretation may change by jurisdiction
- Cross-lingual misclassification can inflate false positives
- Human reviewer inconsistency can affect calibration quality

## Go/No-Go

Go only when:

- HITL enforcement tests pass
- tenant isolation negative tests pass
- privacy lint gates pass
- determinism replay checks pass
