# Copilot Model Governance (Preview + Cost Controls)

## Purpose

This document encodes how Summit records GitHub Copilot model availability, preview state, and
policy prerequisites. It is evidence-first: changes must reference evidence IDs in `evidence/index.json`
and adhere to the Summit Readiness Assertion.

## Readiness Assertion

All preview model changes must align with `docs/SUMMIT_READINESS_ASSERTION.md` and should be treated as
"Governed Exceptions" until the feature reaches GA.

## Canonical Data Model

Summit records model catalog data in `src/connectors/copilot/models.catalog.json` and enforces
preview behavior through `src/policies/copilotModelPolicy.ts`. The catalog is intentionally
minimal and data-only, capturing:

- **Profile ID** (provider/model)
- **State** (`preview`, `ga`, `retired`)
- **Availability tiers** (e.g., Copilot Pro+ and Copilot Enterprise)
- **Client surfaces** (VS Code chat/ask/edit/agent, Copilot CLI)
- **Policy prerequisites** (Summit-defined keys, never GitHub internal names)
- **Premium multipliers and promo windows** (time-bounded, deny-by-default)

## Preview Governance Rules

1. **Policy prerequisite required**: Preview models must declare `policyRequiredKeys`.
2. **Promo window is bounded**: If a promo window is active, a known `premiumMultiplier` is required.
3. **Unknown multiplier = deny**: Summit blocks preview usage when a multiplier is unknown during
   an active promo window.
4. **Fallback planning**: Preview usage requires a documented fallback model plan in GA docs.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: silent cost spikes, preview instability, policy misconfiguration, audit gaps.
- **Mitigations**: deny-by-default multipliers, documented fallback chain, policy prerequisite keys, evidence-first CI gate.

## Source Alignment (Public)

- GitHub Changelog: "Claude Opus 4.6 fast is now in public preview for GitHub Copilot" (2026-02-07).
  https://github.blog/changelog/
- GitHub Docs: "Requests in GitHub Copilot" (premium request multiplier and promo window details).
  https://docs.github.com/en/copilot

## Evidence IDs

- `EVD-CLAUDEOPUS46FAST-CATALOG-001`
- `EVD-CLAUDEOPUS46FAST-COST-002`
- `EVD-CLAUDEOPUS46FAST-GATES-003`
