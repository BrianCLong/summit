# How to debug lock contention in 3 minutes

When a Postgres incident hits, use the DB Observability v2 tools to capture the state quickly without SSH access.

## 1) Enable and scope access

- Set `DB_OBSERVABILITY_V2=1` in the API process.
- Only admins can call the endpoint or CLI; non-admins receive `403`.
- The endpoint is rate-limited (default: 5 requests per minute) to avoid adding load during incidents.

## 2) Capture a snapshot (API)

```text
POST /api/admin/db-observability/snapshot
Authorization: Bearer <admin token>

{
  "explain": {
    "queryId": "activeSessions",
    "parameters": { "limit": 10 }
  }
}

```text

Response highlights:

- `data.locks`: waiting/blocking PIDs, lock modes, relations, and wait durations.
- `data.slowQueries`: source (`pg_stat_statements` when available, otherwise the app slow log) and top statements.
- `data.explain`: `EXPLAIN (FORMAT JSON)` for the whitelisted template you requested.
- `data.summary`: human-readable summaries for war-room updates.

## 3) Capture a snapshot (CLI)

```text
cd server && pnpm db:observability -- --explain=activeSessions --params=limit=10

```text

What you get:

- A short textual summary for incident comms.
- The full JSON payload for timelines or SIEM ingestion.
- `--list` shows allowed explain templates; arbitrary SQL is blocked.

## 4) Interpret the lock graph fast

- `waiting_pid` vs. `blocking_pid`: who is blocked vs. who is holding.
- `relation`: which table/index is affected.
- `waiting_ms` / `blocking_ms`: how long each session has been stuck; prioritize the longest blockers.
- If `locks` is empty, lock contention is cleared—move to slow queries or app-level causes.

## 5) Triage slow queries

- `pg_stat_statements` rows show `mean_exec_time` and `calls`; focus on the highest mean time with many calls.
- If `source` is `app_slowlog`, you are seeing application-captured slow statements instead (extension not enabled).

## 6) Add to the incident timeline

Both the endpoint and CLI emit structured `db_observability` audit events that can be pulled into incident timelines automatically.

## 7) Quick remediation checklist

- Kill or pause the top `blocking_pid` if it is a runaway job and you have approvals.
- Add an index for repetitive slow statements if missing and safe to deploy.
- If locks involve migrations, ensure no concurrent writers and rerun in a maintenance window.
- Consider temporarily lowering client concurrency or enabling statement timeouts to stop new blockers.
