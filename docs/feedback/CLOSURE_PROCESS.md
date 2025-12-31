# Customer Feedback Closure

Ensures every customer-facing issue is resolved, communicated, and verifiable with evidence.

## Closure Checklist

1. **Resolution summary:** What changed and why (link to PR/changelog).
2. **Shipped version:** Build/tag, environment(s), and rollout window.
3. **Evidence of fix:** Tests, dashboards, or probes demonstrating the issue no longer reproduces.
4. **Residual risk:** Known limitations, feature flags, or follow-up work.
5. **Customer confirmation:** Acknowledgement from requester/CSM; include date and channel.
6. **SLO/SLI impact:** Note error budget recovery, latency normalization, or cost stabilization.

## Tracking

- Each intake card maintains a `Closure` section capturing the checklist.
- Resolution data is mirrored to the weekly operating review and linked to `ROADMAP_INPUTS.md` for signal aggregation.
- Reopened items must document the regression gap and add a new verification artifact.

## Communication Templates

### Incident Follow-up (P0/P1)

- **Subject:** `[Resolved] <service> - <issue> - <build/tag>`
- **Summary:** One-line description + customer blast radius.
- **Impact Window:** Start/end timestamps and affected regions.
- **Root Cause / Trigger:** Brief, factual description.
- **Mitigation:** Actions taken and rollback readiness.
- **Verification:** Tests/probes/dashboards confirming recovery.
- **Next Steps:** Hardening items with owners and dates.

### Fix Confirmation (P2/Feature)

- **Subject:** `[Update] <area> - <issue/feature> shipped in <build/tag>`
- **What Changed:** Key behavior change or UX improvement.
- **How to Validate:** Steps/screens or API reference.
- **Support:** How to request assistance or report regressions.

### Upgrade Guidance (when applicable)

- **Subject:** `[Action Required] Upgrade to <version> for <reason>`
- **Why:** Security/performance/compliance driver.
- **Instructions:** Steps to upgrade, flags/toggles, rollback path.
- **Timeline:** Recommended adoption window and support channels.

## Exit Criteria for Closure

- Intake card status set to `closed` only after customer confirmation (or documented attempt + timeout policy).
- Communication artifacts attached to the card and stored in the customer communications archive.
- Metrics updated: time-to-close, confirmation rate, and reopen rate tracked monthly.
