# Marketing Narrative System

This package contains the governed prompt stack for generating, refining, and validating Summit’s external narrative assets. The prompts mirror engineering-grade gates to keep marketing content technically accurate, claim-safe, and reviewable like code.

## Components

- `master-prompt.md`: Authoritative generator prompt that produces a complete marketing/pitch corpus with explicit scope, rules, and quality bar.
- `sub-agent-prompt.md`: Single-artifact perfection agent used to harden individual assets.
- `orchestrator.md`: End-to-end workflow for coordinating generator, perfector, claim registrar, consistency auditor, and risk reviewer.
- `agents/`: Specialized sub-agent prompts used by the orchestrator.
- `outputs/REQUIRED_OUTPUTS.md`: Checklist of deliverables expected from a marketing-system PR.

## Operating Principles

1. No placeholders or hype; every claim must be defensible and scoped.
2. Align terminology with governance artifacts and keep consistency across decks, web, press, and sales enablement.
3. Map strong or moderate claims to the claim registry and supply evidence references.
4. Respect channel readiness (internal, partner, public) before release.

## Usage Pattern

1. Run the Master Prompt to generate or refresh the corpus.
2. Send each artifact through the Sub-Agent Perfector.
3. Use the Claim Registrar to assign claim IDs and evidence, updating `governance/claims.registry.yaml`.
4. Run the Consistency Auditor and Risk Reviewer; address findings.
5. Prepare the PR using `.github/pull_request_template_marketing.md` and attach consistency/risk reports.

## Directory Interactions

- Governance artifacts (claim policy, schema, registry) live under `governance/` and are referenced by these prompts.
- Marketing artifacts themselves should live in `marketing/`, `pitch/`, `sales/`, and `press/` with clear audience/channel markers.

## Enforcement Hooks

- CI validates claims with `scripts/ci/validate_claims_registry.py` (see `.github/workflows/claim-validation.yml`).
- Forbidden phrases, channel scope, and comparative bases are governed by `ci/claim-lint-ruleset.yaml`.

Use these prompts as the canonical entry point for any external narrative work so marketing assets maintain the same rigor as GA engineering deliverables.
