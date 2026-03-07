# Projects dashboard (GitHub Projects v2)

## Dashboard link

- Primary board: https://github.com/orgs/summit/projects/1
- If you operate a fork or alternate org, set `PROJECT_OWNER`/`PROJECT_NUMBER` repo variables to match your board URL (pattern: `https://github.com/orgs/<org>/projects/<number>`).

## Board shape

- Views (backed by the `Status` single-select field):
  - **Intake**: new/untriaged (`Status` = "Todo" or empty), filter `sort:created-desc`.
  - **Triage**: `Status` = "Triage"; filter to SEV-1/2 or P1/2 for daily standups.
  - **In Progress**: `Status` = "In Progress".
  - **Blocked**: `Status` = "Blocked" with SLA label surfaced for breaches.
  - **Done**: `Status` = "Done", auto-archived after 14 days of inactivity.
- Saved filters for severity/priority slices:
  - `is:open "Severity"="SEV-1"` and `is:open "Severity"="SEV-2"`.
  - `is:open label:P1` and `is:open label:P2` (or use a `Priority` field if defined).

## Custom fields (Project v2)

- **Severity** (single select): `SEV-1`, `SEV-2`, `SEV-3`, `SEV-4`.
- **SLA** (date): customer/internal due date for response/resolution.
- **Component** (text): owning subsystem or service.
- **Owner** (user): accountable DRI (mirrors codeowners where possible).
- **Target Sprint** (text or iteration): sprint label (e.g., `2025.10.S3`).
- **Status** (single select): `Todo`, `Triage`, `In Progress`, `Blocked`, `Done` (drives views above).

## Automations

- **Auto-add new issues**: issues opened/reopened in the repo are added to the project via `.github/workflows/projects-sla.yml`.
- **SLA breach highlighting** (daily 06:00 UTC and manual dispatch):
  - Items with `SLA` past today and `Status` not `Done` are moved to **Blocked**, labeled `SLA: Breached`, and receive an audit comment.
  - Uses `PROJECT_OWNER`, `PROJECT_OWNER_TYPE` (`organization` or `user`), and `PROJECT_NUMBER` repository variables plus `PROJECTS_TOKEN` secret (classic token with project write); defaults to repo owner and project 1 if unset.
- **Auto-archive**: items in `Done` with no updates for 14 days are archived to keep the board lean.
- **Filters**: views above should pin the severity/priority filters so SEV-1/2 and P1/2 stay in focus during triage.

## Population with existing audit outputs

1. Convert audit artifacts into issues, tagging Severity and SLA:
   - Bugs: `tmp-audit/audit-2025-12-02.log` and recent findings in `TEST_FAILURES_WEEK1.md`.
   - Tech debt: `TECH_DEBT.md`, `TECH_DEBT_TRACKER.md`, and `TEST_DEBT.md`.
   - Deprecations: `DEPRECATIONS.md` if present; otherwise capture entries from `README_deprecations` sections in relevant services.
2. When creating each issue, set:
   - `Severity` (`SEV-1`/`SEV-2` for blocking regressions, `SEV-3/4` for minor items).
   - `SLA` date based on support policy (e.g., SEV-1 = 24h, SEV-2 = 72h).
   - `Component` aligned to the owning directory/service.
   - `Owner` to the accountable engineer.
   - `Target Sprint` to the next attainable sprint.
3. The workflow will ingest new issues automatically; for historical items, use **Add item** → **Repository issue** in the project UI, then bulk-set custom fields.

## Slack and Teams embedding

- **Slack**:
  - Add the dashboard URL as a channel bookmark for `#project-intelgraph` (or your project channel).
  - Create a Workflow Builder shortcut that posts the project URL + `Intake`/`Triage` views each morning.
  - Pin the `SLA: Breached` saved search to the channel topic for rapid escalation.
- **Microsoft Teams**:
  - In the project team channel, add a **Website** tab pointed to the dashboard link above.
  - Post a recurring message (Teams scheduler) with the SEV-1/2 and P1/2 view URLs.
  - Enable notifications for mentions on `SLA: Breached` issues to keep DRIs aware.

## Operating model

- Daily triage: open `Triage` view filtered to SEV-1/2 and P1/2, assign Owner and Target Sprint.
- Weekly review: validate `Done` items before archival; ensure SLA labels cleared when work is completed.
- Metrics: export board CSV weekly for trend analysis (SLA hit rate, time-in-status, backlog aging).
