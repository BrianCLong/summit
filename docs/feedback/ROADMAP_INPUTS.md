# Roadmap Inputs from Field Signals

This guide codifies how production and customer signals inform the roadmap without causing churn.

## Quarterly Signal Review

- **Inputs:**
  - Top recurring categories from `INTAKE_MODEL.md` (bugs/usability/performance/cost/security).
  - SLA/SLO breaches and error-budget consumption trends.
  - Performance and cost drifts identified by `verify-regression-safety` and observability dashboards.
  - Partner escalations and integration friction themes.
  - Customer-requested features that unblock adoption or renewals.
- **Process:**
  - Aggregate data monthly; synthesize into a quarterly review.
  - Tag each signal with severity, blast radius, and customer tier.
  - Identify systemic gaps (tooling, architecture, documentation) and propose mitigation tracks.

## Roadmap Adjustment Principles

- **Stability first:** No roadmap changes that reduce regression coverage or bypass release gates.
- **Tradeoff transparency:** Every adjustment documents the capability gained vs. risk/effort tradeoff.
- **Customer traceability:** Each roadmap item references the intake cards and closures it addresses.
- **Capacity guardrails:** Reserve at least 30% of capacity for field feedback hardening while maintaining strategic bets.

## Update Workflow

1. Propose adjustments in the quarterly review, linking supporting evidence and intake IDs.
2. Capture decision record: rationale, alternatives considered, and explicit tradeoffs.
3. Update roadmap artifacts (features/epics) with target releases and success metrics.
4. Reflect changes in `docs/roadmap/STATUS.json` summary during the next operating review.

## Outputs

- **Quarterly Field Feedback Addendum:** Appendix to roadmap with ranked themes, owners, and planned mitigations.
- **Success metrics:** Reduction in recurrence rate, improved intake-to-close time, and improved customer NPS/renewal signals.
- **Validation loop:** Post-release measurement required before closing the loop on the signal.
