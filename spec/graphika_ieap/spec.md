# Graphika-Zone IEAP Specification

Defines the Interface-Executable Assessment Protocol (IEAP) packaging of analysis components for evaluator-run assessments.

## Objectives

- Convert analysis pipelines into evaluator-executable components with deterministic replay.
- Provide metric outputs plus proof objects that commit to determinism tokens and component versions.
- Reduce integration friction via stable IDL and conformance tests.

## Component Lifecycle

1. **Authoring**: Implement evaluator interface methods (`submit_input`, `retrieve_metrics`, `register_capabilities`).
2. **Packaging**: Containerize component with conformance test suite and interface version manifest.
3. **Execution**: Evaluator invokes with determinism token; component enforces compute budgets and policy profile.
4. **Reporting**: Component returns metric outputs and metric proof object with Merkle commitments and optional TEE quote.
5. **Logging**: Transparency digest emitted for proof object and stored in manifest/proof store.

## Compatibility & Deprecation

- Interface versions must remain backward-compatible within minor releases; adapters provided for breaking changes.
- Deprecation windows published alongside IDL revisions.

## Evaluator Integration

- API surface documented in `integration/intelgraph/api/ieap_openapi.md`.
- Handoff contract required for evaluator delivery (`spec/common/evaluator_handoff_contract.md`).
