# Prompt: Evidence Badge Supply Chain v1

## Objective
Implement the Evidence Badge v1 supply-chain workflow with deterministic public payloads, SBOM attestation + verification, redaction gate, and PR badge surfacing.

## Requirements
- Add badge schema (`schemas/badges/endpoint_badge_v1.jsonschema`).
- Add supply-chain summary schema (`schemas/evidence/supplychain_summary_v1.jsonschema`).
- Implement deterministic badge emitter and schema validation gate.
- Implement SBOM attestation workflow with SHA-pinned actions.
- Verify attestation via cosign and emit evidence summary + badge payload.
- Enforce public redaction policy before publish.
- Publish badge + summary to public evidence path.
- Add update-in-place PR comment surface for the badge.
- Add evals + regression tests for determinism, redaction, and comment idempotency.
- Update roadmap status and governance decision/tradeoff entries.

## Acceptance Criteria
- Badge payload is deterministic and schema-valid.
- Attestation verification sets badge red on failure.
- Public evidence payloads pass redaction policy gate.
- PR comment is a single update-in-place comment.
- Actions in supplychain workflow are SHA pinned.

## Scope
This prompt governs edits to the files listed in `prompts/registry.yaml` under the prompt entry.
