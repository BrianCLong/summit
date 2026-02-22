# IntelGraph — 11 Parallel Epics Summary

This document summarizes the 11 parallel epics orchestrated for the IntelGraph platform.

## Epic Status Overview

| Epic ID | Epic Name | Status | Owner |
|---------|-----------|--------|-------|
| EP01 | Backlog, Scope & Stakeholder Alignment | In-Progress | Product |
| EP02 | Architecture & ADRs | In-Progress | Architecture |
| EP03 | Data Modeling & Graph Schema | Ready | Data |
| EP04 | API & GraphQL Gateway | Ready | API |
| EP05 | Ingestion Pipelines | Ready | Ingest |
| EP06 | Privacy, Security & Compliance | Ready | Security |
| EP07 | Provenance & Auditability | Ready | Provenance |
| EP08 | Frontend & UX | Ready | Frontend |
| EP09 | AI/Analytics & RAG | Ready | AI/Analytics |
| EP10 | CI/CD, IaC & Environments | Ready | DevOps |
| EP11 | Observability & SRE | Ready | SRE |

## Global Guardrails
- **API Reads**: p95 ≤ 350 ms, p99 ≤ 900 ms.
- **API Writes**: p95 ≤ 700 ms, p99 ≤ 1.5 s.
- **Neo4j Ops**: 1-hop p95 ≤ 300 ms.
- **Availability**: ≥ 99.9%/month.
- **Cost**: Dev ≤ $1k/mo, Staging ≤ $3k/mo, Prod ≤ $18k/mo.

## Backlog
The full structured backlog is available in [tasks.csv](./tasks.csv).
Total tasks: 209.
Ready status: 100%.

### Backlog Columns
- **ID**: Task unique identifier (EPxx-Txx).
- **Epic**: Name of the parent epic.
- **Title**: Short description of the task.
- **Component**: Target service or package.
- **AcceptanceCriteria**: Detailed verification steps.
- **Dependencies**: Prerequisite tasks.
- **Risk**: Likelihood/Impact (Low/Medium/High).
- **Effort**: Estimated size (S/M/L).
- **Priority**: Execution order (High/Medium/Low).
- **Status**: Ready/In-Progress/Done.

### Validation
A validation script is located at `scripts/validate-backlog.py` to ensure the integrity of the backlog data.
