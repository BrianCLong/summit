# IEAP API IDL

Summarizes evaluator-facing methods and payload contracts. Full OpenAPI defined under `integration/intelgraph/api/ieap_openapi.yaml`.

## Methods

- `registerCapabilities(capabilityDescriptor)` → Capability registration acknowledgment and compatibility matrix.
- `submitInput(request, determinismToken, policyProfile)` → Job handle; budget and policy constraints applied.
- `retrieveMetrics(jobHandle)` → Metric outputs, metric proof object reference, transparency log digest.

## Payload Considerations

- All inputs and outputs are strongly typed; schemas enforce deterministic serialization.
- Determinism tokens and policy profiles are mandatory.
- Responses must include compute budget usage and any policy-triggered redactions.
