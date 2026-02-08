# Monitoring skills & automations

## Skill concepts (instruction-only)

1. **summit-ci-governance-brief**
   - **Purpose**: Summarize CI status, merge queue, and required checks; emit a compact evidence-first report.
   - **Inputs**: GitHub Actions dashboards, `.github/required-checks.yml`, `docs/CI_STANDARDS.md`.
   - **Outputs**: Thread post with a table of failing checks, suspected ownership, and next actions.
   - **Non-actions**: No code changes; no reruns without human approval.

2. **summit-security-observability-watch**
   - **Purpose**: Monitor security scan results, audit signals, and observability regressions; queue items for review.
   - **Inputs**: `SECURITY/`, `docs/security/`, security workflows, and alerting dashboards.
   - **Outputs**: Thread post with prioritized alerts and evidence links.
   - **Non-actions**: No config changes; no disabling gates; no policy edits.

## Automation concept (background)

- **Name**: `ops-signal-sweep`
- **Schedule**: Weekdays every 2 hours (09:00–19:00 local time).
- **Threads**:
  - Post CI summaries to **CI & Governance**.
  - Post security/observability summaries to **Security & Observability**.
- **Safety posture**:
  - Read-only profile.
  - Requires human approval for any Git action beyond `safeCommands`.
  - Emits a checklist of recommended manual actions instead of executing them.

## Evidence-first output template

- **Signal snapshot**: timestamp, source URLs, last green/last red.
- **Delta summary**: what changed since prior sweep.
- **Risk flags**: severity, potential blast radius, recommended owner.
- **Next review queue**: items staged for human decision.
