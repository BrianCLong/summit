# UI Spec — Migration Compatibility View

## Purpose
Present OMCP migration artifacts, compatibility proofs, and breakage certificates.

## Layout
- Schema delta summary with type/field/action changes.
- Migration plan and compatibility shim overview with rule counts.
- Proof panel showing witness chain, deterministic diff (if shadow executed), and attestation status.
- Breakage certificate banner when compatibility fails, listing minimal breaking changes.
- Replay controls leveraging replay token.
