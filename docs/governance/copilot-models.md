# Copilot Model Governance (Preview + GA)

This governance note defines how Summit records Copilot model profiles, preview states, policy prerequisites, and cost multipliers. Summit treats the public preview of Claude Opus 4.6 fast as an evidence-backed profile with explicit prerequisites and deny-by-default cost handling.

## Readiness Assertion

Summit governance for preview models inherits the Summit Readiness Assertion as the readiness baseline for adoption decisions. See `docs/SUMMIT_READINESS_ASSERTION.md` for the authoritative readiness posture.

## Canonical Profile Fields

Summit records Copilot model profiles in `src/connectors/copilot/models.catalog.json` with the following canonical fields:

- **id**: Canonical model identifier (e.g., `anthropic/claude-opus-4.6-fast`).
- **state**: `preview`, `ga`, `retired`, or `unknown`.
- **tiers**: Allowed Copilot plans (e.g., `copilot_pro_plus`, `copilot_enterprise`).
- **surfaces**: Client surfaces where the model is selectable (VS Code chat/ask/edit/agent, Copilot CLI).
- **policyRequiredKeys**: Summit-defined prerequisite keys (never GitHub internal names).
- **premiumMultiplier**: Known premium request multiplier if published.
- **promoWindow**: Time-bounded window for published multipliers.

## Policy Prerequisites

Summit records a policy prerequisite key when public documentation states an admin opt-in requirement. For Claude Opus 4.6 fast preview, the public changelog notes that Copilot Enterprise admins must enable a policy to allow fast mode in order for the model to appear in the picker, so Summit sets a prerequisite key and treats the profile as gated by policy. The key remains Summit-defined to avoid guessing internal control names. See `src/connectors/copilot/models.catalog.json` for the canonical key list.

## Preview + Cost Governance

Preview profiles must include explicit fallback plans and deny-by-default cost handling during promotional windows. Public documentation for Copilot requests lists a promotional window and a premium request multiplier for Claude Opus 4.6 fast, so Summit stores a time-bounded `promoWindow` and explicit `premiumMultiplier` values. During the promo window, missing multipliers are treated as blocking defects and surfaced via policy tests.

## Public Sources (Operational Facts Only)

- GitHub changelog: Claude Opus 4.6 fast is in public preview for Copilot, available via the model picker in VS Code and Copilot CLI, and requires Copilot Enterprise admins to enable the fast mode policy for availability. (https://github.blog/changelog/2026-02-07-claude-opus-4-6-fast-is-now-in-public-preview-for-github-copilot/)
- GitHub Copilot requests documentation: premium request multiplier for Claude Opus 4.6 fast preview is published for a promotional window (Feb 7–16, 2026). (https://docs.github.com/en/copilot/about-github-copilot/requests-in-github-copilot)
