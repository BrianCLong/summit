# Policy Bundles

Policy bundles bind a runtime policy document to an attested skill-registry snapshot.

## What is a policy bundle?

A policy bundle is a JSON artifact (`policy-bundle.<env>.json`) that records:

- deterministic `policy_sha256` for `summit/agents/policy/policy.yml`
- deterministic `skills_sha256` for `summit/agents/skills/registry.snapshot.json`
- release metadata (`env`, `created_at`, version fields)
- governance approvals and placeholder signatures

## Regenerate bundles

```bash
node tools/governance/build-policy-bundles.ts
```

To allow a governance-approved prod bundle:

```bash
ALLOW_GOV_APPROVAL=1 node tools/governance/build-policy-bundles.ts
```

## Approvals and signatures

- `approvals` captures who has explicitly approved a bundle.
- `signatures` currently uses deterministic SHA-256 placeholders for signer metadata.
- Production verification requires `approvals` to include `governance` and at least one signature.

## Runtime and provenance linkage

At runtime, policy loading can call `loadRuntimePolicy(env, runId)`.

- In `prod`, bundle verification runs first and fails closed.
- Verification emits `POLICY_BUNDLE_VERIFIED` events to `summit/agents/policy/policy-events.jsonl`.
- In `dev`/`test`, policy YAML-only loading remains supported for local workflows.
