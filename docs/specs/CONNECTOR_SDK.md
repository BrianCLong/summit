# CONNECTOR_SDK

## Purpose

Provide a governed OSINT connector substrate for Summit.

## Scope

This spec defines:
- connector manifest contract
- connector output contract
- deterministic execution requirements
- policy reference requirements
- evidence metadata requirements

## Non-goals

- live provider auth
- distributed scheduling
- graph persistence
- entity resolution

## Invariants

1. Connector manifests must validate against `schemas/connectors/connector-manifest.schema.json`.
2. Connector outputs must validate against `schemas/connectors/connector-output.schema.json`.
3. Identical input + raw fixture + transform source must produce identical output.
4. Policy denial prevents execution.
5. Connectors must emit source metadata and transform hash.

## Artifact contract

Each example connector must ship:
- `connector.yaml`
- `transform.ts`
- `fixtures/input.json`
- `fixtures/raw.json`
- `fixtures/output.json`
- `fixtures/evidence.json`

## Acceptance criteria

- two example connectors validate and replay
- output ordering is stable
- evidence metadata is generated deterministically
- registry enumerates active connectors
