# Evaluator Interface Specification (IEAP Core)

This document defines the cross-wedge contract between Summit/IntelGraph components and an external Evaluator framework. It emphasizes deterministic execution, metric reproducibility, and MOSA-friendly interoperability.

## Goals

- Provide a stable, versioned interface surface that Evaluators can call without performer assistance.
- Guarantee deterministic replays via determinism tokens and dataset snapshots.
- Deliver structured artifacts (metric proof objects, witness chains, transparency log entries) that survive third-party execution.

## Interface Requirements

- **Capabilities registration**: Components expose capability descriptors (inputs, outputs, required resources, effect typing) and declare compatibility rules and deprecation windows.
- **Invocation**: Evaluator calls include a determinism token (seed, dataset snapshot ID, module version set) and optional policy profile for redaction/egress controls.
- **Budget enforcement**: Each call carries max runtime and memory limits; violations must be reported in the metric proof object.
- **Result retrieval**: Metric outputs, intermediate artifact references, and conformance verdicts returned via strongly typed schemas (OpenAPI outlines aligned with `integration/intelgraph/api/*_openapi.md`).
- **Replay & audit**: Proof objects embed Merkle commitments to artifacts; transparency log digests emitted per run.

## Versioning & Compatibility

- Semantic versioning with backward-compatible minor releases; breaking changes require adapter guidance and deprecation timeline.
- Conformance test suites must be updated with every version bump and packaged alongside container images.
- Evaluator-facing changelog must document interface shifts and associated rights implications.

## Security & Rights

- All invocations must respect scope tokens and rights assertions when proprietary stubs are present.
- Trusted execution environment (if available) should produce attestation quotes attached to proof objects.
- No secrets may transit the evaluator channel; redaction profiles default to passive-only exports.

## Artifacts

- Metric proof object schema (see `spec/graphika_ieap/metric_proof_object.md`).
- Determinism token format (see `spec/common/determinism_tokens.md`).
- Transparency log contract (see `spec/common/transparency_log.md`).
- Conformance suite manifest bundled with container delivery.
- Evaluator handoff contract (see `spec/common/evaluator_handoff_contract.md`).
