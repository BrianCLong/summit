# Replit & Lovable Integration Codex Prompt Library

## Purpose
This library turns the Replit and Lovable integration roadmap into ready-to-run Codex UI prompts. Each phase now includes context, prerequisites, the prompt itself, and a validation checklist so autonomous coding sessions can land in a review-ready state.

## Usage Workflow
1. **Pick the phase** that matches your current milestone and skim the prerequisites to confirm the target repositories, secrets, and dashboards exist.
2. **Paste the prompt** into Codex UI. Replace placeholders such as `<REPLIT_OAUTH_TOKEN>` or `<SUMMIT_BRANCH>` with real values before execution.
3. **Capture the outcome**: commit hashes, generated diffs, screenshots, and test runs belong in the linked Summit ticket or Maestro task log.
4. **Run the validation checklist** to ensure security, telemetry, and documentation requirements are satisfied prior to merge.

> ℹ️ **Tip:** If Codex delivers partial output, rerun with the same prompt but prepend a short reminder describing the missing deliverables (e.g., "focus on the OpenAPI spec"). This keeps the agent aligned without rewriting the entire brief.

---

## Phase 1 – Cloud IDE Connector Service
**Scope summary:** Build the Summit ↔ Replit connector microservice that mints secure IDE sessions and propagates secrets.

**Prerequisites**
- Summit Vault path `summit/replit/oauth` populated with client ID/secret.
- Empty service scaffold under `services/cloud-ide-connector/` and a GitHub App or PAT with repo access.
- Maestro Conductor topic `cloud-ide.events` provisioned in the event bus.

**Prompt Template**
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

**Validation Checklist**
- [ ] OAuth secrets are read through Vault helpers rather than plaintext config.
- [ ] Webhook payloads persist in Maestro with correlation IDs for investigations.
- [ ] Tests: `npm run test -- --filter cloud-ide-connector` and `npm run lint` succeed.
- [ ] OpenAPI spec documents request/response bodies for both endpoints.

---

## Phase 2 – In-Editor AI Coding Assistance
**Scope summary:** Blend Replit AI autocomplete and Lovable agent chat into the Summit editor experience.

**Prerequisites**
- WebSocket gateway credentials for both AI providers stored in Summit secrets.
- Feature flag `ai.multimodel.assistant` defined so rollout can be staged.
- Graph editor analytics hooks ready to capture completion accept/reject metrics.

**Prompt Template**
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

**Validation Checklist**
- [ ] Feature flag toggles the UI without requiring redeploy.
- [ ] Rejected completions emit analytics events with model/provider metadata.
- [ ] Tests: `npm --workspace client test -- MultiModelAssistantPanel` and `npm --workspace server test -- ai-proxy` pass.
- [ ] Security review confirms JWT scope enforcement and request rate limits.

---

## Phase 3 – Debugging & Automated Fix Pipelines
**Scope summary:** Expand Maestro Conductor so it can hand regressions to AI debugging loops.

**Prerequisites**
- Maestro workflow templates accessible at `maestro/workflows/*.yaml` with extension points for `debug` and `fix` steps.
- Grafana dashboard `AI-Automation` created with panels for step timings and success rate.
- Provenance ledger credentials verified so artifacts can be stored.

**Prompt Template**
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

**Validation Checklist**
- [ ] Workflow definitions include timeout and retry policies per step.
- [ ] Provenance ledger entries link to investigation IDs for auditability.
- [ ] Telemetry: traces appear in OpenTelemetry collector with service name `maestro.ai-debug`.
- [ ] Tests: `npm --workspace maestro-conductor run test:smoke` completes successfully.

---

## Phase 4 – Deployment & Secrets Federation
**Scope summary:** Enable Maestro to deploy to Replit Autoscale and Lovable Supabase while synchronising secrets safely.

**Prerequisites**
- Deployment targets registered in Maestro inventory with environment metadata (region, scaling policies).
- Secrets bridge module able to read Summit Vault paths and call external APIs.
- `/docs/deployment/hybrid-cloud.md` skeleton page created for documentation updates.

**Prompt Template**
```
You are orchestrating hybrid deployments leveraging Replit Autoscale and Lovable Supabase.
Steps:
1. Implement deployment blueprints in Maestro for `replit.autoscale` and `lovable.supabase` targets with health checks.
2. Extend the secrets manager bridge to sync Summit Vault entries into Replit Secrets and Supabase config, rotating keys post-deploy.
3. Update deployment dashboards to display environment parity, domain mappings, and Supabase migration status.
4. Add automated rollbacks using Maestro's policy engine when observability alerts fire.
Validation: Integration tests for secrets rotation, mocked API deployments, and documentation in `/docs/deployment/hybrid-cloud.md`.
```

**Validation Checklist**
- [ ] Secrets rotation logs redact values but retain version IDs.
- [ ] Rollback hooks trigger when synthetic health checks fail.
- [ ] Tests: `npm --workspace maestro-conductor run test:deploy` and `npm run docs:lint` succeed.
- [ ] Hybrid cloud documentation lists supported regions and failover procedure.

---

## Phase 5 – Real-Time Collaboration Layer
**Scope summary:** Surface multiplayer IDE activity and AI participation inside IntelGraph investigations.

**Prerequisites**
- Summit presence service exposing WebSocket channel for user cursors.
- Policy toggles defined in `policy/ai-participation.yaml` to gate AI access.
- Audit log pipeline ready to ingest collaboration events.

**Prompt Template**
```
You are enhancing Summit's collaboration UX with embedded cloud IDE sessions.
Actions:
1. Build a `CollaborationDock` UI module showing live Replit cursors, Lovable agent summaries, and Summit presence indicators.
2. Connect WebSocket events from the connector service to update activity feeds and timeline annotations inside IntelGraph investigations.
3. Implement consent gating so analysts can invite AI agents into sessions while respecting Summit policy toggles.
4. Log all collaborative edits and AI interventions into audit trails accessible via `security/audit-log` APIs.
Testing: Cypress E2E covering multi-user editing, plus contract tests for audit log emissions.
```

**Validation Checklist**
- [ ] Collaboration dock degrades gracefully when external providers are offline.
- [ ] Consent prompts record `granted_by` and `scope` fields in audit logs.
- [ ] Tests: `npm --workspace client run test:e2e -- --spec collaboration-dock.cy.ts` and contract tests succeed.
- [ ] Accessibility audit (axe) shows no regressions in the editor screen.

---

## Phase 6 – AI Model Governance & Cost Controls
**Scope summary:** Deliver unified guardrails for AI provider usage, spend, and performance feedback.

**Prerequisites**
- `ai-governor` service deployed with feature flag toggles for new providers.
- Cost guard package configured with budget thresholds per workspace/team.
- Slack webhook for Maestro notifications validated in non-production.

**Prompt Template**
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

**Validation Checklist**
- [ ] Quota enforcement returns clear error messaging and links to governance docs.
- [ ] Spend charts align with cost guard anomaly alerts (<5% variance).
- [ ] Tests: `npm --workspace ai-governor run test:quota` and integration suite for burst scenarios pass.
- [ ] Governance dashboards highlight provider breakdown (Replit vs Lovable) and acceptance metrics.

---

## Follow-Up Backlog Ideas
- Blueprints for chaos drills simulating IDE outages and failover to local tooling.
- Prompt variants tailored for red-team exercises validating AI guardrails and incident response.
- Migration checklists and test plans when Replit or Lovable release major API version changes.
