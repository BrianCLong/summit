# Performer-to-Evaluator Handoff Contract

This contract defines the minimum deliverables required for evaluator-run assessments.
It is written to fit on a single page when rendered, while remaining machine-readable.

## Scope

- Applies to IEAP, VCEC, and MPEP components, plus OA/MOSA packaging for ICD-RAM.
- All deliverables must be independently executable by evaluator tooling.

## Required Interface Methods

| Method                  | Purpose                                           | Required Inputs                                  | Outputs                                     |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| `register_capabilities` | Declare interfaces, resource needs, effect types  | Component manifest                               | Capability descriptor                       |
| `submit_input`          | Execute with determinism token and policy profile | Input payload, determinism token, policy profile | Run ID                                      |
| `retrieve_metrics`      | Fetch metric outputs and proofs                   | Run ID                                           | Metrics, proof object, witness chain digest |
| `get_conformance_suite` | Retrieve evaluator-facing tests                   | Version ID                                       | Test bundle + instructions                  |
| `get_rights_assertions` | Retrieve rights/markings table                    | Version ID                                       | Rights assertion artifact                   |

## Determinism & Replay

- Determinism token includes: seed, dataset snapshot ID, module version set, and
  evaluator framework version.
- Replay token binds to a time window and the transparency log entry.

## Artifact Bundle

- **Metric proof object** (hash commitments + resource usage + policy decisions).
- **Witness chain** (hash-linked input/intermediate/output manifests).
- **Transparency log receipt** (append-only log inclusion proof).
- **Rights assertion artifact** (rights category per deliverable).
- **Conformance suite** (pass/fail evidence).

## Conformance & Acceptance

- Evaluator executes the conformance suite against the interface version.
- Failures block evaluation; remediation must include updated proof objects.

## Security & Rights

- Policy-as-code enforcement required for scope tokens and redaction profiles.
- Proprietary stubs must be explicitly labeled and accompanied by behavioral
  conformance tests.

## Evidence Pack

Deliverables must include:

1. Component container image + checksum.
2. Conformance suite + execution transcript.
3. Determinism token schema version.
4. Proof object + witness chain sample.
5. Transparency log inclusion proof.
