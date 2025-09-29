# Symphony MVP‑2 Demo (10 minutes)
1) `npm run dev` (client) + `cd operator-kit && npm run dev` (API)
2) Open `/console` → **Model Matrix** shows rolling 3h / rolling 5h / daily PT clocks.
3) Runbook → `/route/execute` → **Explain Route** shows denial reasons & quotas.
4) Trigger `just symphony-drill` → observe p95 alert → auto GH+Jira + Slack/PagerDuty.
5) VS Code: select text → **Symphony: Execute Route** → quick result + audit id.
