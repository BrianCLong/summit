# Replit & Lovable Integration Codex Prompt Library

## Purpose
This library converts the Replit and Lovable integration roadmap into ready-to-run Codex UI prompts. Each prompt calls out the Summit (IntelGraph) touchpoints, supporting services (e.g., Maestro Conductor, secrets sync), and the validation criteria we expect from an autonomous coding session.

## How to Use
- Pick the phase that matches your current integration milestone and paste the prompt into Codex UI.
- Provide repository credentials or API tokens when the prompt requests placeholders such as `<REPLIT_OAUTH_TOKEN>`.
- Capture generated diffs, run tests, and summarize outcomes back in Summit issue tracking for traceability.

---

## Phase 1 – Cloud IDE Connector Service
```
You are building the "Summit ↔ Replit Connector" Node.js service.
Objectives:
1. Implement OAuth handshake with Replit using client credentials from Vault (`summit/replit/oauth`).
2. Expose REST endpoints:
   - `POST /sessions` → accepts Summit repo slug, branch, and optional file focus to mint a Replit launch URL.
   - `GET /sessions/:id` → returns live session metadata including editors present.
3. Sync `.env.summit` secrets into the Replit workspace using the Secrets API. Mask sensitive keys in logs.
4. Register webhooks to receive IDE activity (`code.push`, `session.closed`) and publish them onto the Maestro Conductor event bus (`cloud-ide.events`).
5. Include integration tests with `nock` for API mocks and `tap` unit tests covering auth fallback flows.
Deliverables: TypeScript source under `services/cloud-ide-connector/`, OpenAPI spec, Dockerfile, and GitHub Actions workflow for CI.
```

## Phase 2 – In-Editor AI Coding Assistance
```
You are extending the Summit web client to embed Replit AI autocomplete and Lovable agent chat.
Tasks:
1. Create a `MultiModelAssistantPanel` React component with tabs for "Replit AI" and "Lovable Agent".
2. Wire the component into the graph editor view (`client/src/features/editor/`) with WebSocket streams for live code suggestions.
3. Add API proxy routes in `server/src/routes/ai-proxy.ts` that forward to Replit and Lovable endpoints, enforcing Summit JWT auth.
4. Implement prompt templates that attach the active investigation context (graph node metadata, Maestro workflow ID) before forwarding to either assistant.
5. Cover the client additions with Jest + Testing Library tests and add contract tests for the proxy endpoints.
Outcome: Developers can toggle between models, receive inline suggestions, and log accepted completions back to IntelGraph.
```

## Phase 3 – Debugging & Automated Fix Pipelines
```
You are updating Maestro Conductor workflows to orchestrate AI-driven debugging.
Goals:
1. Define a `debug.replit` pipeline step that spins up a remote debugging session with the connector service.
2. Add a `fix.lovable` step that feeds failing Jest specs and stack traces into Lovable Agent mode for patch generation.
3. Persist artifacts (diffs, logs, session links) into the Summit provenance ledger via `prov-ledger` package utilities.
4. Emit OpenTelemetry spans around each automated fix attempt and surface status in Grafana dashboard `AI-Automation`.
5. Expand smoke tests in `maestro-conductor` package to validate orchestration graphs and webhook handling.
Result: Maestro can hand off regressions to AI loops and record traceable outcomes for compliance.
```

## Phase 4 – Deployment & Secrets Federation
```
You are orchestrating hybrid deployments leveraging Replit Autoscale and Lovable Supabase.
Steps:
1. Implement deployment blueprints in Maestro for `replit.autoscale` and `lovable.supabase` targets with health checks.
2. Extend the secrets manager bridge to sync Summit Vault entries into Replit Secrets and Supabase config, rotating keys post-deploy.
3. Update deployment dashboards to display environment parity, domain mappings, and Supabase migration status.
4. Add automated rollbacks using Maestro's policy engine when observability alerts fire.
Validation: Integration tests for secrets rotation, mocked API deployments, and documentation in `/docs/deployment/hybrid-cloud.md`.
```

## Phase 5 – Real-Time Collaboration Layer
```
You are enhancing Summit's collaboration UX with embedded cloud IDE sessions.
Actions:
1. Build a `CollaborationDock` UI module showing live Replit cursors, Lovable agent summaries, and Summit presence indicators.
2. Connect WebSocket events from the connector service to update activity feeds and timeline annotations inside IntelGraph investigations.
3. Implement consent gating so analysts can invite AI agents into sessions while respecting Summit policy toggles.
4. Log all collaborative edits and AI interventions into audit trails accessible via `security/audit-log` APIs.
Testing: Cypress E2E covering multi-user editing, plus contract tests for audit log emissions.
```

## Phase 6 – AI Model Governance & Cost Controls
```
You are adding unified controls for AI model usage across Replit and Lovable integrations.
Requirements:
1. Extend the `ai-governor` service to register new providers with quota buckets and budget ceilings.
2. Implement admin UI widgets for per-team model selection, rate limits, and spend charts.
3. Send daily usage digests to Slack via Maestro notifications, including anomalies detected by the cost-guard package.
4. Store acceptance/rejection metrics for AI suggestions to refine prompt strategies.
5. Provide unit tests for quota enforcement logic and integration tests that simulate burst traffic.
Deliverable: Updated governance docs and dashboards demonstrating end-to-end visibility.
```

---

## Follow-Up Backlog Ideas
- Blueprints for chaos drills simulating IDE outages.
- Prompt variants for red-team exercises validating AI guardrails.
- Migration checklists when Replit or Lovable release API changes.
