# Guardrailed Prompt → Procedure (P2P) Standard

## Readiness Assertion

This standard is governed by the Summit Readiness Assertion and inherits the Law of Consistency for
all Procedure lifecycle artifacts.

## Purpose

Summit provides a governed path to translate analyst intent into deterministic Procedures that run
inside the platform without executing arbitrary code. This subsumes agentic automation gains while
preserving auditability, policy enforcement, and evidence generation.

## Scope

- Procedures are declarative YAML/JSON assets.
- Procedures compile deterministically into executable plans.
- Every Procedure run emits evidence and audit hooks.

## Guardrails (Deny-by-default)

- Only allowlisted step types and connectors are permitted.
- Egress paths must be explicitly allowlisted.
- Evidence IDs are deterministic and do not include wall-clock timestamps.

## Allowlist Registry (drift-tracked)

```yaml
allowlist:
  stepTypes:
    - graph.query
    - enrich.http
    - score.model
    - notify.slack
    - export.csv
  httpDomains:
    - api.ipify.org
    - enrich.summit.local
    - threat.summit.local
  exportDestinations:
    csv:
      - internal://evidence
      - internal://reports
```

## Deterministic Evidence IDs

Evidence IDs follow:

```
EID-CTECHSPRING-<git_sha8>-<procedure_name>
```

Each execution writes:

- `evidence/agentic-procedures/<EID>/report.json`
- `evidence/agentic-procedures/<EID>/metrics.json`
- `evidence/agentic-procedures/<EID>/stamp.json`

## Import / Export Matrix

| Category | Allowed                                                | Notes                                    |
| -------- | ------------------------------------------------------ | ---------------------------------------- |
| Imports  | Graph query templates, connector references, model IDs | Must be referenced by ID, not raw code.  |
| Exports  | CSV (restricted), notifications, internal reports      | Export destinations must be allowlisted. |

## Non-goals

- No arbitrary web browsing.
- No user-supplied script execution.
- No autonomous, unbounded agent execution.

## Developer Workflow

- Validate and compile: `pnpm exec tsx scripts/procedures/lint.ts`
- Refresh goldens: `pnpm exec tsx scripts/procedures/compile_all.ts`

## MAESTRO Alignment

- **Layers**: Foundation, Data, Agents, Tools, Observability, Security
- **Threats Considered**: prompt injection, smart-chained vulnerabilities, data exfiltration
- **Mitigations**: schema enforcement, policy allowlists, deterministic compilation, audit hooks
