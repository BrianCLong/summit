# IOC Lifecycle Compiler with Provenance-Weighted Decay (ILC-PWD)

**Objective:** Replace opaque risk scores with auditable lifecycle transitions, minimal support proofs, and counterfactual impacts.

**Core Flow**

1. Retrieve evidence from telemetry and open-source feeds.
2. Compute aggregate confidence using provenance-weighted decay (source trust + freshness).
3. Determine lifecycle state (NEW, ACTIVE, RETIRED) using confidence and conflict measures.
4. Generate transition proof with minimal support set of evidence items.
5. Emit lifecycle update artifact containing state, proof, replay token, and policy token.

**Artifacts**

- Lifecycle update artifact (state, proof, determinism token, evidence capsule, witness chain).
- Counterfactual impact optional section describing remediation effects.
