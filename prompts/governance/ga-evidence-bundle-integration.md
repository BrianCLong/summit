# GA Evidence Bundle Integration Prompt (v1)

## Mission

Integrate the supply-chain evidence bundle (SBOM + provenance + verification gate) into MVP-4 GA governance by wiring verification into GA/release paths, updating GA checklists and compliance mappings, and adding a release-note snippet grounded in verified artifacts.

## Required Actions

- Locate GA verification entry points and existing evidence bundle scripts.
- Ensure the canonical GA verification command enforces evidence bundle validation with deterministic pass/fail behavior.
- Update GA governance docs with copy/paste commands, expected outputs, and pass/fail criteria.
- Map evidence bundle verification to compliance controls (SBOM + provenance integrity).
- Add a release note entry that references the verified evidence bundle.
- Add negative-proof tests for missing SBOM/provenance, checksum mismatch, and malformed SBOM.

## Non-Negotiable Constraints

- No placeholders, TODOs, or aspirational language in code or docs.
- Prefer existing conventions (scripts/release/, scripts/ga/, docs/ga/, docs/compliance/).
- Keep changes minimal and deterministic.
- Do not edit unrelated documentation or refactor broadly.
- Evidence verification must be enforceable in CI via the GA verification entrypoint.
