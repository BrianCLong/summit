# PCOV Spec Overview

Defines the Palantir wedge for Policy-Compiled Ontology Views with Stable ABI.

## Goals

- Compile policy-scoped ontology views for subject + purpose.
- Produce stable ABI artifacts for clients and agents.
- Enforce redaction and latency budgets at compile-time.

## Inputs

- Ontology schema (types, fields, actions).
- Policy-as-code specification for subject context and purpose.
- Schema and index versions.

## Outputs

- Compiled ontology view (types, fields, actions).
- ABI artifact with type schemas and request validation.
- View capsule with replay token and commitments.

## Processing Stages

1. **Load** ontology and policy bundle.
2. **Compile** permitted view with redaction pushdown.
3. **Generate** ABI schema and compatibility mapping.
4. **Serve** requests constrained by ABI and budgets.

## Governance

- Policy decisions are logged in witness chains.
- Schema evolution uses compatibility mapping and versioned ABI artifacts.
