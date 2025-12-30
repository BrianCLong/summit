# PCOV Spec Overview

Defines the Palantir wedge for Policy-Compiled Ontology Views with Stable ABI.

## Goals

- Compile policy-scoped ontology views per subject context and purpose.
- Generate stable ABIs exposing only permitted types, fields, and actions.
- Serve requests through the view ABI with replayable artifacts.

## Inputs

- Ontology definitions of object and action types.
- Policy specification describing access constraints.

## Outputs

- Ontology view with redaction pushdown.
- Stable ABI with validation schemas and latency controls.
- View artifact bound to policy and schema versions.
