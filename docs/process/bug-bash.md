# Bug Bash Program

This playbook defines the recurring bug bash cadence, goals, rules, scoring, and reporting process.

## Cadence & Scheduling

- **Frequency:** First Thursday of every month.
- **Time:** 10:00–12:00 local engineering time (2-hour session) with optional 30-minute overflow.
- **Reminders:**
  - T-7 days: calendar invite with theme focus and top areas (SEV-1 backlog, top 20 crashers).
  - T-2 days: Slack reminder in #eng-announcements and #qa with scoring link and triage owners.
  - T-1 hour: Slack nudge with Zoom/Meet link, scoring sheet, and test build links.
- **Hosts:** Rotating DRI from QA or Release Engineering; backup host assigned in the calendar invite.
- **Channels:**
  - **Slack:** #eng-announcements (broadcast), #bug-bash-live (live triage), #release-readiness (follow-ups).
  - **Calendar:** “Monthly Bug Bash – <Month>” recurring invite that includes Zoom/Meet link and scoring sheet.

## Goals

1. **SEV-1 clearance:** All SEV-1 items either resolved or under active mitigation with an owner and ETA.
2. **Top 20 crashers:** Reduce the crash/top error list by driving fixes or mitigations during/after the session.
3. **Responsiveness:** Lower mean time to resolve (MTTR) for new findings and aged backlog.
4. **Quality signals:** Capture reproducible repro steps, logs, and environment notes for every issue.

## Success Metrics

- **Issues closed:** Count of issues moved to `Closed/Resolved` during the session.
- **Mean time to resolve (MTTR):** Average hours from `opened_at` to `closed_at` for resolved items.
- **SEV-1 coverage:** Percent of open SEV-1 items with a mitigation or fix owner by session end.
- **Crashers addressed:** Number of items from the “Top 20 crashers” list that have fixes, mitigations, or accepted risk with owner.
- **Follow-up hygiene:** Percentage of open items pushed into GitHub Projects with owner + SLA and next action.

## Pre-Event Checklist

- Update the recurring **calendar invite** with the month’s focus (SEV-1s, crashers, new surface areas).
- Post the **Slack announcement** (template below) with:
  - Date/time, Zoom/Meet link, environment/build to test.
  - Link to the **scoring sheet** (Google Sheet or Notion DB) and instructions to export as CSV after the event.
  - Triage DRI list and escalation paths (SRE on call, release lead).
- Refresh the **Top 20 crashers** list from observability/error dashboards.
- Ensure **GitHub Projects** board is ready with columns: `Inbox`, `Triage`, `In Progress`, `Ready to Validate`, `Done`.
- Confirm **reward criteria** and budget (gift cards, kudos, leaderboard).

## Slack Announcement Template

```
:beetle: Monthly Bug Bash – <Month>
When: First Thursday, 10:00–12:00 <timezone>
Where: <Zoom/Meet link>
Focus: SEV-1 clearance + Top 20 crashers
Scoring sheet: <Google Sheet/Notion link>
Triage leads: <names>
Prep: Pull latest build + review top crashers list
```

## Triage Rules

- **Severity:** Use SEV scale (SEV-1 blocking production, SEV-2 high-impact, SEV-3 moderate, SEV-4 low).
- **Acceptance:** Every finding must include repro steps, expected vs. actual, build/commit hash, logs/screenshots.
- **Routing:**
  - SEV-1: live escalation to on-call SRE + owning team TL; open incident if customer impact.
  - SEV-2/3: create/attach to GitHub issue with component label; add to Projects board.
  - SEV-4: backlog with due date or close if non-actionable.
- **Ownership & SLAs:**
  - SEV-1: owner assigned within 15 minutes; mitigation in place within 4 hours; fix ETA agreed.
  - SEV-2: owner + ETA within 24 hours; target fix within 5 business days.
  - SEV-3/4: owner + SLA within 7 business days.
- **Dupes:** Link duplicates to canonical issue; keep only the canonical issue in the scoring sheet.
- **Top crashers:** Prioritize fixes for any item in the Top 20 list; confirm crash volume drop before close.

## Scoring & Rewards

- **Base points by severity resolved:** SEV-1 = 8, SEV-2 = 5, SEV-3 = 3, SEV-4 = 1.
- **Quality bonus:** +1 for reproduction artifacts (logs/screenshots), +1 for validated fix, +1 for adding regression test.
- **Collaboration bonus:** +1 for pairing or cross-team fix; +1 for documenting workaround in release notes.
- **Rewards:**
  - Weekly leaderboard shout-out in #eng-announcements.
  - Quarterly top performer gift cards or team lunch.
- **Scoring sheet columns (for Google Sheet/Notion):**
  - `issue_id`, `title`, `severity`, `component`, `status`, `opened_at`, `closed_at`, `owner`, `score`, `evidence`, `notes`.
  - Export to CSV after the session for automated reporting via `ops/bug-bash/report.ts`.

## Event Flow

1. **Kickoff (5 mins):** goals, focus areas, and safety reminders (no prod changes without guardrails).
2. **Execution (90–120 mins):** testers log findings in the scoring sheet; triage leads assign owners and SLAs.
3. **Fix & validate:** engineers land fixes or mitigations; QA validates and marks status in scoring sheet.
4. **Wrap-up (15 mins):** review metrics, winners, and announce follow-up actions; export scoring sheet CSV.

## Reporting

- Run `ops/bug-bash/report.ts --input <export.csv> --event "<Month YYYY>"` to generate a Markdown summary in `docs/process/bug-bash-reports/`.
- Include in the report: issues closed, MTTR, severity mix, top contributors, components with highest findings, and open follow-ups.
- Post the generated summary in **Slack (#eng-announcements + #bug-bash-live)** and attach to the calendar invite notes.

## Follow-Ups

- Create/attach GitHub issues for every open item and add to **GitHub Projects** with owner + SLA.
- Tag SEV-1 and Top 20 crashers for daily tracking until resolved; keep the board updated.
- Add regression test tasks to the appropriate repository backlog when fixes land.
- Capture learnings in the next retro and update this playbook when rules change.

## Post-Event Comms Checklist

- Post summary in Slack channels with leaderboard and key stats.
- Update the recurring calendar invite notes with the latest report link.
- File follow-up actions in GitHub Projects with owners, SLAs, and due dates.
- Log rewards issued (if any) and refresh the leaderboard.
