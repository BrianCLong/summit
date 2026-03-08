# Human-AI Role Boundaries

This policy defines where human authority must be preserved in AI-assisted decision loops.

## Authority Levels

1.  **Advisory**: AI provides information; Human decides.
2.  **Recommendation Only**: AI suggests a decision; Human must confirm.
3.  **Autonomous**: AI acts without human intervention (requires low risk / reversible actions).

## Controls

*   **Critical Decisions** (e.g., denying service, legal judgments) MUST have `human_override_required: true`.
*   All overrides MUST be logged (`override_logged: true`).

## Enforcement

This policy is enforced via runtime checks and the `human_authority.schema.json` validation.
