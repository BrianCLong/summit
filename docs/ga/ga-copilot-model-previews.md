# GA Checklist — Copilot Model Previews

## Scope

This checklist governs Copilot model preview adoption for Summit. It is evidence-first and
requires deterministic validation before any preview model is allowed in GA pathways.

## Public Source Alignment

- GitHub Changelog: "Claude Opus 4.6 fast is now in public preview for GitHub Copilot" (2026-02-07).
  https://github.blog/changelog/
- GitHub Docs: "Requests in GitHub Copilot" (promo window and premium request multiplier details).
  https://docs.github.com/en/copilot

## Acceptance Criteria (GA Gate)

1. **Catalog correctness**
   - `src/connectors/copilot/models.catalog.json` includes preview metadata.
   - Evidence: `EVD-CLAUDEOPUS46FAST-CATALOG-001`.
2. **Cost multiplier enforcement**
   - Deny-by-default when promo window is active and multiplier is missing.
   - Evidence: `EVD-CLAUDEOPUS46FAST-COST-002`.
3. **CI gate enforcement**
   - Evidence verification runs in `ci-verify` and blocks on failure.
   - Evidence: `EVD-CLAUDEOPUS46FAST-GATES-003`.
4. **Fallback chain documented**
   - Preview adoption includes a documented fallback model plan.
   - Evidence: `EVD-CLAUDEOPUS46FAST-GATES-003` (workflow enforcement + doc linkage).

## Operational Checklist

- [ ] Enterprise policy prerequisite documented and required.
- [ ] Promo window and multiplier encoded; unknown multiplier is denied.
- [ ] Evidence files present and timestamp-isolated (report/metrics contain no timestamps).
- [ ] CI gate passes `evidence-verify`.

## Evidence IDs

- `EVD-CLAUDEOPUS46FAST-CATALOG-001`
- `EVD-CLAUDEOPUS46FAST-COST-002`
- `EVD-CLAUDEOPUS46FAST-GATES-003`
