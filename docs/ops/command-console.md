---
title: Summit Command Console
status: internal
owners:
  - platform-ops
  - incident-response
---

# Command Console (Internal)

The command console is the single, authoritative dashboard for GA operations and incident response. It provides real-time visibility into platform health, governance posture, and kill-switch readiness without enabling mutation paths by default.

## Intended users

- **SRE / Platform Ops:** Track CI health, SLO burn, dependency drift, and blast radius before shipping changes.
- **Security / Governance:** Verify GA gates, policy denials, and evidence bundle freshness during reviews.
- **Incident Commanders:** Inspect tenant kill-switch posture and live incident signals while executing the runbook.

## What decisions it supports

- **Go/No-Go:** GA gate readiness, CI status on `main`, dependency risk, and evidence bundle freshness.
- **Capacity & blast radius:** Tenant activity, rate-limit posture, and ingestion caps to bound incident impact.
- **Safety posture:** Kill-switch state, recent policy denials (LLM/tenant/rate limits), and SLO burn rates.
- **Cost control:** LLM token and cost burn per tenant plus aggregate usage.

## How to use during incident response

1. **Open the console:** `/apps/command-console` (internal-only). Ensure `COMMAND_CONSOLE_ENABLED=true` and present `X-Internal-Token` or an admin role.
2. **Check GA & health:** Validate GA gate status, CI on `main`, dependency risk, and evidence bundle freshness.
3. **Assess blast radius:** Review tenant table for kill-switch activations, rate-limit throttling, and ingestion caps.
4. **Review signals:** Inspect GA gate failures, policy denials, and kill-switch activations to choose containment steps.
5. **Escalate:** If GA gates or health endpoints fail, execute the kill-switch or rate-limit playbooks before resuming traffic.

## Data sources

- GA release service (`/api/ga-release/*`) and GA artifacts (`EVIDENCE_BUNDLE.manifest.json`).
- Internal command console APIs: `/api/internal/command-console/{summary,incidents,tenants}`.
- Observability snapshots: SLO burn, error budgets, and dependency risk summaries.

## Access & guardrails

- Controlled via `COMMAND_CONSOLE_ENABLED` and `COMMAND_CONSOLE_TOKEN` (or admin/system roles).
- Read-only by default—mutation and kill-switch toggles are **not** exposed in this app.
- GA gate now fails if the console app or required health endpoints are missing.
