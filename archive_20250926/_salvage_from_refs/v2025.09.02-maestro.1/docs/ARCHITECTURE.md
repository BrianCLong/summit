# Maestro Architecture (Overview)

## Control Plane
- API, Scheduler/Queue, Policy Gate, Secrets/Identity, Metadata Store, Provenance Service.

## Runners
- K8s Jobs, Container, Local (Serverless adapter in GA).

## Integrations
- IntelGraph via Ingest/Claims/Export APIs; optional Runbook triggers.

## Observability
- OTel traces, metrics, structured logs; budgets/quotas in GA.
