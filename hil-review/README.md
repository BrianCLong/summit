# Human-in-the-Loop Review Workbench

The **hil-review** workbench pairs a Node.js API with a React control surface to triage policy appeals, enforce dual-control approvals, and maintain a complete audit trail.

## Features

- **Appeals queueing:** capture appeals, push them into a pending queue, and navigate with keyboard-first shortcuts (`j`/`k`, `a`/`x`, `n`, `Shift+E`).
- **Dual-control approvals:** backend enforcement prevents any actor from approving/denying twice; final state requires two distinct reviewers.
- **Evidence attachment:** reviewers can attach labelled evidence with contextual notes and optional URLs.
- **Policy collaboration:** propose policy changes globally or per appeal, and ratify them using the same dual-control guardrails.
- **Audit logging:** every mutation records immutable audit entries that include actor, role, timestamp, and relevant metadata.
- **Round-trip JSON export:** export the full decision ledger and import it later without data loss.
- **Role-aware access:** endpoints are protected via role headers (`admin`, `reviewer`, `auditor`) to separate duties.

## Getting Started

```bash
# install dependencies
(cd hil-review/server && npm install)
(cd hil-review/client && npm install)

# start the API
cd hil-review/server
npm start

# start the React UI (in a new terminal)
cd hil-review/client
npm run dev
```

The Vite dev server proxies `/api/*` calls to the Express backend running on port `4000`.

Use the header fields `x-user-id`, `x-user-role`, and `x-user-name` (injected automatically by the client) when calling the API directly.

## API Overview

| Endpoint | Method | Roles | Description |
| --- | --- | --- | --- |
| `/appeals` | `POST` | admin, reviewer | Capture a new appeal. |
| `/appeals` | `GET` | all | List appeals (filter by `?status=`). |
| `/appeals/:id/queue` | `POST` | admin, reviewer | Move an appeal into the triage queue. |
| `/appeals/:id/evidence` | `POST` | admin, reviewer | Attach evidence metadata. |
| `/appeals/:id/decision` | `POST` | admin, reviewer | Record an approve/deny decision (dual-control). |
| `/appeals/:id/policy-suggestions` | `POST` | admin, reviewer | Register a policy suggestion tied to an appeal. |
| `/policy-proposals` | `POST` | admin, reviewer | Submit a cross-appeal policy change proposal. |
| `/policy-proposals/:id/decision` | `POST` | admin, reviewer | Dual-control ratification of a proposal. |
| `/policy-proposals` | `GET` | all | List proposals and their decisions. |
| `/audit-log` | `GET` | admin, reviewer, auditor | Retrieve the complete audit trail. |
| `/export` | `GET` | admin, reviewer | Download the round-trippable JSON bundle. |
| `/import` | `POST` | admin | Replace the persisted state with an exported payload. |

Audit entries include the action namespace (`appeal:*`, `policy:*`, `system:*`), the target object, and contextual details for traceability.

## Keyboard Workflow Cheatsheet

- `j` / `k`: Move selection down/up the queue
- `n`: Focus the new appeal form
- `e`: Focus the evidence attachment form
- `p`: Focus policy suggestion input
- `a`: Approve the active appeal (dual-control)
- `x`: Deny the active appeal (dual-control)
- `Shift+E`: Refresh the JSON export buffer

These shortcuts ensure reviewers can keep hands on the keyboard while triaging.
