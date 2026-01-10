# IEAP API Outline (Evaluator Interface)

This outline mirrors the OpenAPI surface for IEAP endpoints.

## Endpoints

- `POST /ieap/v1/capabilities/register`
- `POST /ieap/v1/runs`
- `GET /ieap/v1/runs/{runId}/metrics`
- `GET /ieap/v1/conformance/{version}`
- `GET /ieap/v1/rights/{version}`

## Core Schemas

- `DeterminismToken`
- `PolicyProfile`
- `MetricProofObject`
- `WitnessChainDigest`
- `RightsAssertionArtifact`
