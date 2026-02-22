You are Jules. Create ONE atomic PR for the Switchboard repo.

PR TITLE:
"Switchboard: Read-only Local Dashboard v1 (status + receipts + decisions)"

SCOPE:
1) Add a tiny local web UI (read-only) that shows:
   - MCP servers health/backoff state
   - recent tool executions (from receipts store)
   - recent policy preflight decisions (allow/deny + reason)
2) No auth needed (localhost-only), but add a warning banner and bind to 127.0.0.1.
3) Provide `switchboard ui` command to launch and print the URL.
4) Tests:
   - server starts
   - endpoints respond
   - renders minimal page (snapshot / smoke test)

CONSTRAINTS:
- Read-only. No external services. No telemetry export.
- Keep it atomic; do not refactor receipt store.

DELIVERABLE:
Plan + file-by-file diff + acceptance criteria + test commands + commit message.
