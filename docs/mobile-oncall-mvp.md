# Mobile & On-Call MVP Scope v0

## Mission Focus

Design mobile-first, on-call-ready workflows so operators and leaders can act safely from anywhere—optimized for the critical 5% of actions that must work at 3am.

## 1) Mobile-First Use Cases

### On-call engineers

- **Receive & triage incidents**: rich push alerts (severity, service, runbook link, graph of blast radius) with quick actions (ack/resolve).
- **Acknowledge & escalate**: single-tap ack with SLA timers, quick escalate to secondary/on-call manager, add note/annotation.
- **Resolve & document**: resolve with cause code, attach evidence (screenshots/log snippets), add timeline entries.
- **Key dashboards**: live incident list, personal queue, service health summary, runbook shortcuts, pager state (on-call/OOO), recent changes feed.

### Leaders / commanders

- **Status overview**: portfolio-wide incident rollup, red/yellow/green view, major incident banner with ETA to next update.
- **Approvals**: change/rollback approval, comms sign-off, customer-impact messaging templates.
- **Summaries**: auto-generated SITREP digest (channels, impact, mitigations), subscribe/unsubscribe to incident threads.

### Cross-functional/others

- **Notifications**: proactive tasks (review postmortem, follow-up action due), service announcements, maintenance windows.
- **Lightweight worklists**: assigned tasks with due dates, checklist progress, ability to mark done or comment.
- **Reference**: view runbooks, quick-start checks, service ownership directory with contact options.

## 2) Mobile Surfaces

### Web vs. native app (MVP)

- **Native shell for core on-call**: push notifications, biometric unlock, deep links into incident views, limited offline caching.
- **Mobile web for breadth**: read-only dashboards, task worklists, runbook viewer; avoid heavy data entry.
- **Shared design system**: responsive components with touch targets ≥44px, high-contrast dark mode as default for low-light usage.

### Navigation patterns

- **Home tabs**: Incidents · Tasks · Status · Profile. Persistent bottom nav; sticky “Now” banner for active incident.
- **Within incident**: accordion for timeline/impact/actions; floating ack/resolve CTA; quick toggle to call bridge/Slack room.
- **Leaders’ view**: card stack by severity; tap opens status sheet; swipe to mark “seen/needs follow-up”.

### Offline / poor connectivity

- **Graceful degradation**: cache current on-call schedule, last 20 incident headers, runbook snippets.
- **Queued intents**: allow ack/add-note offline with clear “pending sync” state and retry/backoff.
- **Bandwidth-aware**: fallback to text-only alerts; avoid auto-playing media; compress attachments.

## 3) Security & Guardrails

- **Auth**: SSO + MFA required; biometric re-auth for high-risk actions (resolve, approvals). Session pinning to device + jailbreak/root detection.
- **Device posture**: block high-risk actions on non-compliant devices; read-only mode when posture unknown.
- **Scoped actions**: mobile allows ack/resolve/escalate, add short notes, approve pre-approved changes; blocks schema edits, bulk config changes, secret rotation.
- **Lost device**: short session TTL (e.g., 12h), remote revocation via MDM + server-side token invalidation; wipe cached data on next launch.
- **Auditability**: every mobile action emits event with device ID, geo coarse, auth strength.

## 4) Artifacts

### Mobile & On-Call MVP Scope v0

- **Goal**: Ship a dependable incident/on-call strip with leader status visibility and safe approvals.
- **Included**:
  - Native push alerts with deep links; quick ack/resolve.
  - Incident detail (impact, timeline, tasks, responders, runbook link) with add-note and evidence upload.
  - Status dashboard: org/portfolio RYG, major incident banner, ETA to next update, subscription controls.
  - Task worklist: assigned tasks, due dates, mark done/comment.
  - Security: SSO+MFA, biometric step-up, session revocation, offline cache for headers/runbooks.
- **Excluded (v0)**: editing runbooks, creating new services/incidents, bulk ownership edits, custom notification rules, offline attachments upload beyond 10MB.
- **Quality bar**: sub-2s load on 4G for incident list; actionable push taps-to-ack ≤2; offline ack sync success ≥99% within 2 min of reconnect.

### Text Wireframes

**Main On-Call Screen (Incident detail)**

```
[App Bar: Incident #, Severity pill (RED), Timer since open]
[Banner: "You are on call" · Pager toggle · Escalate]
[Impact summary card]
- Affected: Checkout API · 500s · Region US-EAST
- Customer impact: High
- Next update in: 12m
[Actions row]
- Ack (primary) | Resolve | Escalate | Call Bridge | Open Slack
[Timeline accordion]
- 02:14 Created · auto
- 02:16 Alert fired · PagerDuty
- 02:18 You acknowledged (pending sync offline)
[Tasks]
- [ ] Mitigate by disabling feature flag X (due 02:40)
- [ ] Capture logs from pod set A
[Runbook + links]
- "Checkout latency runbook" (open)
- Recent deploys (open)
[Notes]
- Add note (text/voice) → shows pending if offline
```

**Leader Status Overview**

```
[App Bar: Org Status · last refreshed 02:20]
[Major Incident Banner]
- MI-2412 · RED · ETA next update 10m · Subscribers 42
- Buttons: View, Subscribe/Unsubscribe, Share update
[Portfolio Cards (RYG)]
- Checkout: RED (2 active) · Top issue: latency
- Identity: YELLOW (1 active) · Mitigation underway
- Payments: GREEN · No active
[Approvals]
- Change 1842 rollback? Approve / Decline (biometric gate)
[Summaries]
- Latest SITREP: impact, mitigations, comms status
[Notifications toggle]
- Quiet hours · escalation routing settings
```

### Checklist: “Workflow is mobile-appropriate if…”

- Critical path can be completed in ≤3 taps with thumb reach (bottom-half of screen).
- Works in 1-hand mode: large touch targets, no multi-field forms.
- Degrades gracefully offline (cached view) and queues actions with clear pending state.
- Requires at most a short note/selection; avoids free-form heavy typing.
- Has step-up auth for irreversible actions; read-only when posture uncertain.
- Presents only the minimum fields needed to unblock the operator; hides advanced toggles behind expandable sections.
- Shows latency/refresh hints; never leaves the user unsure if an action was sent.
- Avoids dense tables; uses cards/lists with priority ordering and color-coded severity.
