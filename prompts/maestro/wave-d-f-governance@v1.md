# Prompt: Maestro Wave D–F Governance Hardening (v1)

## Objective

Harden the Maestro Wave D–F prompt packet with governance-aligned allowlist authority, merge verification gates, and a deterministic implication ladder that reinforces clean merges and green CI for the golden path.

## Scope

- Update `ga-graphai/packages/maestro-conductor/MAESTRO_WAVE_D_F_PROMPTS.md` to:
  - Reference allowlist authority sources.
  - Define a merge verification gate that defers execution until A–C merges are verified.
  - Add a 23-order implication ladder that encodes merge-clean and CI-green constraints.
  - Add explicit validation workflow commands for prompt integrity and PR metadata.
- Update `docs/roadmap/STATUS.json` with a revision note and timestamp reflecting the governance update.

## Constraints

- Keep changes additive and limited to the declared scope.
- Do not modify other docs indexes or unrelated prompt packets.
- Do not introduce new tooling or CI behavior beyond documentation.

## Expected Outputs

- Updated Maestro Wave D–F prompt packet with governance references, merge gate, implication ladder, and validation workflow.
- Roadmap status metadata updated with a clear revision note.

## Verification

- Run `npm test` in `ga-graphai/packages/maestro-conductor` and record results.
- Ensure all files end with a newline.
