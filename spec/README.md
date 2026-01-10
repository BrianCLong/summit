# Summit Patent-Style Specification Package

This `/spec` folder provides structured, filing-ready specifications for five competitor
wedges. Each wedge includes a full system outline, data models, threat considerations, and
claim sets aligned with shared primitives for evidence, witness chains, determinism, budgets,
and attestation.

## Shared Primitives

- `common/evidence_bundle.md`
- `common/witness_chain.md`
- `common/determinism_token.md`
- `common/policy_tokens.md`
- `common/budget_contracts.md`
- `common/attestation.md`

## Wedges

- `graphika_anfis/`: Adversarial Narrative Fingerprinting + Intervention Simulator.
- `recordedfuture_ilc_pwd/`: IOC Lifecycle Compiler with Provenance-Weighted Decay.
- `palantir_oaeac/`: Ontology ABI + Enforced Action Contracts.
- `maltego_itd_oip/`: Interactive Trace Distillation into Optimized Investigation Plans.
- `spiderfoot_fopb_lg/`: Federated OSINT with Privacy Budgets + Legal/ToS Gates.

## Governance Alignment

- Regulatory logic must be expressed as policy-as-code.
- Evidence bundles and witness chains must be verifiable before use.
- Determinism tokens enable replayable, auditable outputs.
