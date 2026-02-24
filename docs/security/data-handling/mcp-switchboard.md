# Summit Switchboard (MCP) Data Handling Standard

## Purpose
Define data classification, retention, redaction, and artifact rules for Summit Switchboard (MCP).
This document enforces the never-log contract and deterministic evidence outputs.

## Data Classification
| Data Class | Examples | Handling | Storage |
| --- | --- | --- | --- |
| Credentials (Secrets) | API keys, tokens, passwords, auth headers | Never log, never write to artifacts | In-memory only |
| Tool Metadata | Tool names, descriptions, schemas | Allowed in metrics with hashing | Deterministic artifacts |
| Call Traces | Tool IDs, status codes | Store hashed IDs + status only | Deterministic artifacts |
| Health Signals | Child health status, latency buckets | Allowed | Deterministic artifacts |

## Never-Log List
Redact any key/value where the key matches or contains:
- `*TOKEN*`
- `*SECRET*`
- `*PASSWORD*`
- `BASIC_*`
- `Authorization`
- `Cookie`

## Redaction Rules
- Redaction must occur before logging or artifact serialization.
- Redaction must be deterministic and fully covered by snapshot tests.
- Never emit raw secrets to stdout, stderr, or artifacts.

## Retention & Evidence
- Evidence artifacts must be deterministic, timestamp-free, and ordered.
- Store only hashed identifiers for tool and call traces unless explicitly enabled by policy.
- Evidence retention follows Summit governance evidence policies.

## Decision Reversibility
All autonomous decisions must be reversible. Provide rollback guidance in runbooks and ensure
artifacts include a content hash to support verification and rollback.

## Compliance Gates
- Snapshot tests covering redaction.
- CI grep gate to ensure never-log keys are absent from artifacts.
- Deterministic artifact schema verification.
