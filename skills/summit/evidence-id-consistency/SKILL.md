# Evidence ID Consistency Skill

This skill enforces that all generated artifacts have consistent Evidence IDs and are reproducible.

## Rules

1.  **Never introduce non-deterministic outputs.**
    *   Avoid using `Date.now()` or random values in build artifacts.
    *   Use stable sorting for lists and keys in JSON outputs.

2.  **Always add/update Evidence Map YAML pointers.**
    *   When adding a new artifact type, register it in `docs/governance/evidence-map.yml`.
    *   Ensure the ID follows the pattern `EV-[CATEGORY]-[NAME]`.

3.  **Ensure all generated artifacts are reproducible.**
    *   Output files must be bit-for-bit identical given the same inputs.
