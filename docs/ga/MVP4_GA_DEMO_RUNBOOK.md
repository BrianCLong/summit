# MVP-4 GA Demo Runbook

**Goal:** Execute a flawless end-to-end demo of the Summit MVP-4 platform.

## Prerequisites

*   **Repo State:** Clean checkout of `release/v1.0` (or equivalent stable branch).
*   **Dependencies:** `pnpm install` completed.
*   **Environment:** `.env` configured with valid mock credentials (or local dev mode).
*   **Services:** Docker containers running (`docker compose up -d`).

## Runbook Steps

### 1. Pre-Flight Check (T-Minus 10 Minutes)
*   **Action:** Verify system health.
    ```bash
    bash scripts/health-check.sh
    ```
*   **Expected:** All services `HEALTHY`.
*   **Contingency:** If Redis is down, run `docker compose restart redis`.

### 2. The Setup (Clean Slate)
*   **Action:** Reset the demo tenant.
    ```bash
    npx tsx scripts/seed_baselines.mjs --reset
    ```
*   **Expected:** "Database reset complete. Seed data loaded."

### 3. The Demo Execution

#### Scene 1: Ingestion
*   **Action:** Trigger data ingestion simulation.
    ```bash
    bash scripts/smoke-test.cjs --scenario ingest
    ```
*   **Narrative:** "Here we see raw data entering the Switchboard..."

#### Scene 2: The Graph
*   **Action:** Query the graph API.
    ```bash
    curl -X POST http://localhost:3000/api/graphql -H "Content-Type: application/json" -d '{"query": "{ nodes(limit: 5) { id label } }"}'
    ```
    *(Or use the UI if available)*
*   **Narrative:** "IntelGraph instantly contextualizes the new data..."

#### Scene 3: The Plan (Maestro)
*   **Action:** Trigger a Maestro run.
    ```bash
    npx tsx scripts/maestro-cli.ts run --intent "Analyze Campaign X"
    ```
*   **Narrative:** "Maestro formulates a 5-step plan to investigate..."

#### Scene 4: Governance
*   **Action:** Show the audit log verification.
    ```bash
    node scripts/verify-audit-chain.js
    ```
*   **Narrative:** "And crucially, we can prove exactly what happened."

### 4. Post-Demo Teardown
*   **Action:** Stop services.
    ```bash
    docker compose down
    ```

## "If It Fails" Guide

*   **API Timeout:** Check `docker stats`. If CPU > 90%, pause background ingestion.
*   **Auth Failure:** Run `npx tsx scripts/generate-admin-token.ts` and update your header.
*   **Graph Empty:** Re-run `npx tsx scripts/seed_baselines.mjs`.
