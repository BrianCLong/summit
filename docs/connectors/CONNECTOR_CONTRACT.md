# Connector Contract v0.1

This document defines the schema for the **Connector Contract**.

## Overview

The Connector Contract is a JSON document that describes the capabilities, requirements, and behaviors of a connector in the Summit ecosystem. It is used for:

- **Conformance Testing**: Validating that the connector behaves as expected.
- **Marketplace Compatibility**: Determining if a connector can be used in a given context.
- **Runtime Governance**: Enforcing policies like rate limits and redaction.

## Schema

The schema is defined in `schemas/connectors/ConnectorContract.v0.1.json`.

### Fields

- **identity**: Basic metadata about the connector.
  - `name`: Unique name.
  - `version`: Semantic version.
  - `kind`: `source`, `destination`, or `bi-directional`.
  - `owner`: Team or individual responsible.

- **capabilities**: What the connector can do.
  - `read_scopes`: OAuth scopes required for reading.
  - `write_scopes`: OAuth scopes required for writing.
  - `rate_limits`: Declared rate limits (requests per period).
  - `supported_entities`: List of entities (e.g., `User`, `Ticket`) this connector handles.

- **idempotency**: How the connector handles duplicate requests.
  - `required_keys`: Keys required to ensure idempotency (e.g., `idempotency_key`).
  - `semantics`: `at-least-once` or `exactly-once`.

- **errors**: Mapping of upstream errors to standard codes.
  - `standard_codes_mapping`: Map of upstream codes (e.g., HTTP 404) to Summit error codes.

- **evidence**: Artifacts produced for auditability.
  - `required_artifacts`: List of artifact keys (e.g., `raw_http_response`).

- **redaction**: Privacy controls.
  - `declared_sensitive_fields`: Fields that are sensitive and must be redacted.

## Example

```json
{
  "identity": {
    "name": "github-issues-source",
    "version": "1.2.0",
    "kind": "source",
    "owner": "integrations-squad"
  },
  "capabilities": {
    "read_scopes": ["repo", "user:email"],
    "write_scopes": [],
    "rate_limits": {
      "core": { "requests": 5000, "period_ms": 3600000 }
    },
    "supported_entities": ["Issue", "Comment"]
  },
  "idempotency": {
    "required_keys": ["since"],
    "semantics": "at-least-once"
  },
  "errors": {
    "standard_codes_mapping": {
      "404": "NOT_FOUND",
      "403": "PERMISSION_DENIED",
      "429": "RATE_LIMITED"
    }
  },
  "evidence": {
    "required_artifacts": ["http_trace", "rate_limit_headers"]
  },
  "redaction": {
    "declared_sensitive_fields": ["access_token", "client_secret"]
  }
}
```
