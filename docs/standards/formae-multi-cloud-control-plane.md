# Formae Multi-Cloud Control Plane Subsumption Standard

## Summit Readiness Assertion

Summit asserts immediate readiness to subsume validated Formae multi-cloud control plane capabilities through deterministic planning, deny-by-default governance, and evidence-first CI gates.

## Scope

This standard defines the Minimal Winning Slice (MWS) for integrating a deterministic multi-cloud target graph compiler into Summit.

- Feature flag default: `OFF`
- Delivery envelope: `<= 6 PRs`
- Output contract: deterministic plan + metrics + stamp artifacts

## Ground-Truth Claim Registry (Validation Required)

The following claims are tracked from the InfoQ item context and remain **deferred pending direct capture** in `docs/evidence/formae.md`:

1. `ITEM:CLAIM-01` — Formae introduces a multi-cloud control plane.
2. `ITEM:CLAIM-02` — Cross-cloud orchestration and governance are first-class.
3. `ITEM:CLAIM-03` — Unified management abstraction exists across providers.
4. `ITEM:CLAIM-04` — Kubernetes/cloud-native posture is likely in scope.
5. `ITEM:CLAIM-05` — Enterprise hybrid/multi-cloud complexity reduction is a target.

## Minimal Winning Slice

Summit ingests static AWS/Azure/GCP provider configs and compiles a deterministic normalized plan:

- `artifacts/summit.multi_cloud.plan.json`
- `artifacts/summit.multi_cloud.metrics.json`
- `artifacts/summit.multi_cloud.stamp.json`

### Determinism Rules

- Stable sorting by provider + region.
- Canonical JSON serialization for all artifacts.
- No timestamps in the stamp artifact.
- Stamp includes commit SHA and artifact hashes only.

### Evidence ID Contract

`EVIDENCE:MC:<provider>:<control>:<sha256>`

## Governance Contract

- Provider allowlist: `aws`, `azure`, `gcp` only.
- Policy mode: deny-by-default.
- CI hard-fail on unsupported providers, policy violations, and non-normalized schema.

## PR Stack

1. `feat(multicloud): plan compiler skeleton`
2. `feat(policy): governance guardrails`
3. `feat(evidence): deterministic artifact writer`
4. `feat(ci): multicloud workflow integration`
5. `feat(k8s-registry): cluster metadata ingestion (flag OFF)`
6. `docs(standards): interop and standards mapping`

## MAESTRO Threat Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: provider spoofing, policy bypass, artifact tampering, deterministic drift.
- **Mitigations**: provider allowlist, deny-by-default Rego, SHA256 verification, scheduled drift checks.

## Acceptance Gates

- Deterministic hash is stable across three consecutive runs.
- Compile latency budget: `<= 500ms` per 50 targets.
- Memory budget: `<= 150MB` peak for MWS fixtures.
- CI budget: `<= 2 minutes` for dedicated multi-cloud gate path.

## Non-Goals (MWS)

- Live infrastructure mutation.
- Cloud provisioning execution engines.
- Runtime orchestration beyond static planning.
