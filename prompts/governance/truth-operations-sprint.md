# Truth Operations Sprint Prompt (v1)

You are executing the Truth Operations adversarial defense sprint for Summit/IntelGraph.

## Objective

Deliver the canonical truth-resilience artifacts (documentation, policy-as-code, schema, and roadmap updates) that define how Summit detects, absorbs, resists, and recovers from deliberate information manipulation.

## Scope

You may only modify the following paths:

- `docs/truth-operations/*`
- `policies/truth-defense.rego`
- `schemas/integrity-metadata.schema.json`
- `docs/roadmap/STATUS.json`
- `agents/examples/TRUTH_OPERATIONS_ADVERSARIAL_PACK.json`
- `prompts/registry.yaml`
- `prompts/governance/truth-operations-sprint.md`
- `artifacts/agent-runs/TRUTH_OPERATIONS_ADVERSARIAL_PACK.json`

## Required Outputs

- Threat model, integrity scoring, narrative collision, temporal truth, authority continuity, blast-radius containment docs
- Policy-as-code rules that gate actions and enforce strategic silence
- Integrity metadata schema aligned with the docs
- Roadmap status update indicating the sprint documentation refresh
- Agent task spec that matches `agents/task-spec.schema.json`
- Prompt registry entry with SHA-256 hash
- Agent run artifact entry for traceability

## Constraints

- Respect the Summit Constitution and governance mandates.
- Express regulatory or compliance logic as policy-as-code (Rego).
- Avoid introducing secrets, PII, or default credentials.
- Keep changes minimal and focused on the Truth Operations sprint.
- Prefer clarity and auditability over speculative features.

## Verification

- Ensure prompt hash matches `prompts/registry.yaml`.
- Ensure task spec conforms to `agents/task-spec.schema.json`.
- Ensure policy thresholds and schema fields align with the docs.
