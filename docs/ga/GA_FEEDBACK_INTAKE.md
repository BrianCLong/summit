# GA Feedback Intake & Triage Process

**Purpose:** Normalize feedback flow during Week-0 to prevent noise from drowning out signals.

## 1. Intake Channels

All GA feedback must be routed to **GitHub Issues** in the core repository.

*   **Slack/Chat:** Do **NOT** report bugs in chat. Start a thread, then create an issue.
*   **Email:** Forward to Release Captain for issue creation.
*   **Direct:** Direct messages to engineers are ignored.

## 2. Issue Normalization

Every GA-related issue must contain:

*   **Label:** `ga-feedback`
*   **Source:** (Customer, Partner, Internal User)
*   **Component:** (UI, API, Docs, Ops)
*   **Evidence:** Screenshot, Log snippet, or Reproduction Steps.
*   **GA Relevance:** Is this a regression from the GA Baseline? (Yes/No)

**Template:**

```markdown
### GA Feedback
**Source:** [Who reported it]
**Component:** [Affected Component]
**Version:** [Commit SHA or Version Tag]

**Observation:**
[What happened]

**Expected Behavior (per GA Docs):**
[What should have happened, verify against docs/ga/]

**Evidence:**
[Logs, Screenshots]

**Reproducible?**
[Yes/No - Steps]
```

## 3. Triage SLA & Severity Matrix

**Triage Owner:** Release Captain (Rotation).
**SLA:** All `ga-feedback` issues triaged within **4 hours** (business hours).

| Severity | Definition | SLA (Response/Plan) | Action |
| :--- | :--- | :--- | :--- |
| **P0 (Critical)** | Data Loss, Security Breach, Total Outage, Legal Violation. | 1 Hour | **HOTFIX** (See `docs/ga/GA_HOTFIX_POLICY.md`) |
| **P1 (High)** | Major feature broken (no workaround), SLO Breach. | 4 Hours | **HOTFIX** or Fast-Follow Patch |
| **P2 (Medium)** | Minor bug, Doc error, UI glitch (workaround exists). | 24 Hours | Queue for Week-1 Patch |
| **P3 (Low)** | Feature request, Polish, Aspirational. | 48 Hours | Backlog for V2 / Post-GA |

## 4. The Golden Rule

> **"No Fix Without Reproduction."**

*   Engineers are forbidden from committing fixes for "potential" bugs based on hearsay.
*   Evidence must be attached to the issue before a PR is opened.
*   For "Doc Confusion", the "Reproduction" is 3 separate users asking the same question.
