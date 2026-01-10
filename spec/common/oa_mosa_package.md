# OA/MOSA Package Template (ICD-RAM Core)

Defines the standard artifacts for open architecture and modular open systems approach compliance.

## Inputs

- Architecture specification: modules, interfaces, compatibility rules.
- Proprietary boundary declarations and technology insertion points.
- Rights categories and restrictive markings mapped to deliverables.

## Outputs

- **Interface Control Document (ICD)**: versioned interface methods, schemas, effect typing, deprecation rules, adapter guidance.
- **Conformance test suite**: validator harness for third-party plug-ins against ICD.
- **Rights assertion artifact**: structured table mapping deliverables to DFARS rights categories and peer-review allowances.
- **Transparency digest**: hash of OA/MOSA package logged in transparency log for evaluator verification.
- **Self-score worksheet**: OA/MOSA evidence summary aligned to `compliance/darpa/oa_mosa_self_score.md`.

## Scoring Dimensions

Explicitly score interoperability, composability, reusability, maintainability, extensibility, and peer-review readiness. Capture counterfactual insertion plans for technology refresh options.

## Delivery

- Package as container image or bundle with ICD, tests, and rights assertion table.
- Include proprietary stubs where needed to preserve evaluator-run capability without code disclosure.
- Provide changelog and compatibility matrix per version.
- Store rights assertions in the rights assertion store (`integration/intelgraph/services/rights_assertion_store.md`).
