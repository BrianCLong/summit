# Replit & Lovable Integration Codex Prompt Library

## Purpose
This library turns the Replit and Lovable integration roadmap into ready-to-run Codex UI prompts **and** the supporting delivery playbook required to ship each milestone. For every phase you will find the implementation blueprint, hand-off expectations, validation artifacts, and the Codex prompt to accelerate execution. The goal is to remove ambiguity so an autonomous agent or blended human+AI team can progress from design to production without re-deriving requirements.

## Usage Workflow
1. **Pick the phase** that matches your current milestone and confirm all prerequisites are satisfied (infrastructure, secrets, access grants, dashboards).
2. **Review the implementation blueprint** to align on architecture decisions, API contracts, and ownership boundaries.
3. **Paste the prompt** into Codex UI. Replace placeholders such as `<REPLIT_OAUTH_TOKEN>` or `<SUMMIT_BRANCH>` with real values before execution, and reference the acceptance criteria while iterating.
4. **Capture the outcome**: commit hashes, generated diffs, screenshots, and test runs belong in the linked Summit ticket or Maestro task log. Publish observability dashboards and runbooks called out in the acceptance criteria.
5. **Run the validation checklist** and phase exit criteria to ensure security, telemetry, documentation, and rollout requirements are satisfied prior to merge.

> ℹ️ **Tip:** If Codex delivers partial output, rerun with the same prompt but prepend a short reminder describing the missing deliverables (e.g., "focus on the OpenAPI spec"). This keeps the agent aligned without rewriting the entire brief.

---

## Phase 1 – Cloud IDE Connector Service
**Scope summary:** Build the Summit ↔ Replit connector microservice that mints secure IDE sessions and propagates secrets.

**Implementation Blueprint**
- **Service layout:**
  - `services/cloud-ide-connector/src/index.ts` → HTTP server + routes.
  - `services/cloud-ide-connector/src/replit/client.ts` → typed SDK wrapper for OAuth, sessions, secrets, and webhooks.
  - `services/cloud-ide-connector/src/maestro/publisher.ts` → publishes normalized events to Maestro via Kafka.
  - `services/cloud-ide-connector/src/config.ts` → Vault-backed configuration with schema validation (zod).
- **API contract (OpenAPI 3.1):**
  - `POST /sessions`
    - Request: `{ repoSlug: string; branch?: string; entryFile?: string; requestedBy: string; }`
    - Response: `{ id: string; launchUrl: string; expiresAt: string; editors: string[]; }`
  - `GET /sessions/{id}`
    - Response: `{ id: string; status: 'pending'|'active'|'closed'; editors: string[]; lastHeartbeat: string; }`
- **Secrets flow:** Read Replit credentials and Summit repo token from Vault, inject into Replit Secrets API, and emit rotation events to Maestro when values change.
- **Security posture:** Enforce Summit JWT on all REST endpoints, require `ide:launch` scope, and mask tokens in structured logs (pino redaction).
- **Operational hooks:** Helm chart in `deploy/charts/cloud-ide-connector`, SLO budgets captured in `/docs/operations/cloud-ide-slo.md`, PagerDuty service mapping recorded in Ops handbook.

**Prerequisites**
- Summit Vault path `summit/replit/oauth` populated with client ID/secret and stored under the `replit-cloud-ide` KV namespace.
- Empty service scaffold under `services/cloud-ide-connector/` and a GitHub App or PAT with repo access.
- Maestro Conductor topic `cloud-ide.events` provisioned in the event bus.
- Network policies opened for outbound calls to `api.replit.com` and inbound webhooks from Replit IP ranges.

**Acceptance & Exit Criteria**
- ✅ OpenAPI spec reviewed and linked from `/docs/api/cloud-ide-connector.md`.
- ✅ Secrets rotation playbook documented in `/docs/operations/cloud-ide-secrets.md` including rollback steps.
- ✅ Load test (`k6`) demonstrates <250ms p95 for session creation with concurrent 50 user load.
- ✅ Deployment pipeline (`.github/workflows/cloud-ide-connector.yml`) builds, tests, scans (Snyk/Trivy), and deploys to staging automatically.
- ✅ Observability dashboards in Grafana show request rate, latency, error budget burn, and webhook processing lag.

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
- [ ] Helm chart renders cleanly (`helm template`) and passes policy checks (`npm run opa:check`).
- [ ] k6 load test report archived in `docs/integrations/cloud-ide/perf.md` with comparison to SLO.

---

## Phase 2 – In-Editor AI Coding Assistance
**Scope summary:** Blend Replit AI autocomplete and Lovable agent chat into the Summit editor experience.

**Implementation Blueprint**
- **Frontend:**
  - `client/src/features/editor/components/MultiModelAssistantPanel.tsx` → tabbed UI + provider switcher.
  - `client/src/features/editor/hooks/useAssistantSession.ts` → manages WebSocket connections, handles reconnect/backoff, and streams tokens into Monaco.
  - Accessibility: keyboard shortcuts `Ctrl+Shift+Space` to summon panel, ARIA roles for tabs.
- **Backend:**
  - `server/src/routes/ai-proxy.ts` → Express router with per-provider handlers, integrates rate limiting (`rate-limiter-flexible`).
  - `server/src/services/assistant-context.ts` → builds context envelope with investigation metadata and user permissions.
- **Data contracts:** Define `AssistantSuggestion` and `AssistantFeedback` types in `packages/common-types/ai.ts` shared by client/server.
- **Security:** Enforce JWT scopes `ai:suggest` and `ai:collaborate`. Record prompt/response metadata in audit log with provider redaction rules.
- **Analytics:** Emit events to `analytics/ai-assist` topic capturing acceptance, rejection, manual edits, and latency.

**Prerequisites**
- WebSocket gateway credentials for both AI providers stored in Summit secrets.
- Feature flag `ai.multimodel.assistant` defined so rollout can be staged.
- Graph editor analytics hooks ready to capture completion accept/reject metrics.
- Design sign-off from UX for tab behavior and keyboard navigation.
- Content security policy updated to allow WebSocket connections to provider endpoints.

**Acceptance & Exit Criteria**
- ✅ User-facing documentation `/docs/ui/ai-assistant.md` explains capabilities, privacy notices, and opt-out flow.
- ✅ Security review approves prompt redaction + rate limits (attach checklist in ticket).
- ✅ Telemetry events visible in Looker dashboard `AI Assistant Adoption` with filters by provider/model.
- ✅ Feature flag staged: `disabled` in production, `beta` in staging, `internal` in dev; change log captured in LaunchDarkly ticket.
- ✅ E2E demo recorded (loom) demonstrating suggestion acceptance, rejection, Lovable agent chat escalation, and analytics traces.

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
- [ ] Accessibility audit via `npm --workspace client run test:a11y -- --view editor` passes with no critical issues.
- [ ] Synthetic monitoring scenario covers provider outage fallback and alerting.

---

## Phase 3 – Debugging & Automated Fix Pipelines
**Scope summary:** Expand Maestro Conductor so it can hand regressions to AI debugging loops.

**Implementation Blueprint**
- **Workflow design:**
  - Extend `maestro/workflows/regression.yaml` with stages `debug_replit` and `fix_lovable` using `type: external` nodes.
  - Introduce `packages/maestro-conductor/src/plugins/replit-debugger.ts` and `lovable-fix-agent.ts` for orchestration logic.
- **Artifact management:** Store diff bundles and session transcripts in `prov-ledger` bucket with TTL policies; index metadata for audit.
- **Observability:** Instrument each step with OpenTelemetry spans (`maestro.ai-debug.*`), push metrics to Prometheus (`ai_debug_sessions_total`, `ai_fix_success_ratio`).
- **Compliance:** Ensure workflow respects `policy/ai-participation.yaml` for approval gates; human override required on production branches.
- **Failure handling:** Add automated fallback to internal on-call when AI fix attempts exceed threshold or produce failing tests twice.

**Prerequisites**
- Maestro workflow templates accessible at `maestro/workflows/*.yaml` with extension points for `debug` and `fix` steps.
- Grafana dashboard `AI-Automation` created with panels for step timings and success rate.
- Provenance ledger credentials verified so artifacts can be stored.
- Chaos testing plan defined to simulate Replit downtime and Lovable API latency spikes.
- Notification routing configured (Slack + PagerDuty) for failed automation runs.

**Acceptance & Exit Criteria**
- ✅ Regression workflow has signed architecture review (include diagram in `/docs/maestro/ai-debug-workflow.md`).
- ✅ Compliance audit: AI-produced patches require human approval recorded in audit log.
- ✅ Runbook `/docs/runbooks/maestro-ai-debug.md` created with triage steps, manual retry instructions, and contact escalation.
- ✅ Load test using replay of historical failures demonstrates <5 min cycle time improvement.
- ✅ Integration with provenance ledger verified by retrieving artifacts through API (`scripts/check_provenance.sh`).

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
- [ ] Failure scenario playbook executed: simulate API downtime and confirm on-call alert path.
- [ ] Compliance sign-off captured in risk register.

---

## Phase 4 – Deployment & Secrets Federation
**Scope summary:** Enable Maestro to deploy to Replit Autoscale and Lovable Supabase while synchronising secrets safely.

**Implementation Blueprint**
- **Deployment blueprints:** Define `deployments/replit-autoscale.yaml` and `deployments/lovable-supabase.yaml` with lifecycle hooks (provision → deploy → verify → promote).
- **Secrets bridge:** Implement `services/secrets-bridge/src/providers/replit.ts` and `supabase.ts`, ensuring encryption-at-rest via Summit KMS before transmission.
- **Observability:** Update deployment dashboards to include release status, drift detection, and Supabase migration health; add logs to ELK pipeline.
- **Security:** Integrate with Summit IAM to mint scoped tokens; rotate secrets post-deploy and record versions in Vault metadata.
- **Documentation:** Expand `/docs/deployment/hybrid-cloud.md` with diagrams, DNS mapping tables, and rollback flow.

**Prerequisites**
- Deployment targets registered in Maestro inventory with environment metadata (region, scaling policies).
- Secrets bridge module able to read Summit Vault paths and call external APIs.
- `/docs/deployment/hybrid-cloud.md` skeleton page created for documentation updates.
- Contract with Security for cross-cloud data residency reviewed and signed off.
- Observability endpoints accessible (Replit metrics API, Supabase status webhooks).

**Acceptance & Exit Criteria**
- ✅ Successful canary deployment to staging Replit workspace, validated via synthetic health checks.
- ✅ Supabase migrations executed with drift detection; results stored in `/docs/deployment/hybrid-cloud.md#supabase-migrations`.
- ✅ Secrets rotation automation tested with dry-run + production-like environment.
- ✅ Policy-as-code tests in `policy/tests/hybrid-cloud.rego` enforce guardrails.
- ✅ Runbooks for rollback/resume stored in `/docs/runbooks/hybrid-cloud-rollback.md`.

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
- [ ] Secrets bridge audit logs stored in secure bucket with 30-day retention.
- [ ] Change advisory board approval recorded prior to production rollout.

---

## Phase 5 – Real-Time Collaboration Layer
**Scope summary:** Surface multiplayer IDE activity and AI participation inside IntelGraph investigations.

**Implementation Blueprint**
- **UI/UX:**
  - `client/src/features/collaboration/CollaborationDock.tsx` showing live participants, AI agent cards, and activity feed.
  - Integrate Monaco decorations for cursors; color-coded by provider.
- **Backend streaming:** Extend `services/presence-gateway` to subscribe to Replit/Lovable webhooks and broadcast normalized events.
- **Policy enforcement:** Evaluate `policy/ai-participation.yaml` before allowing AI join requests; persist consent decisions with TTL.
- **Audit trail:** Expand `services/audit-log` schema to include `source=cloud-ide` events, indexing by investigation ID.
- **Resilience:** Implement offline fallback banner and degrade gracefully to local editor when providers unreachable.

**Prerequisites**
- Summit presence service exposing WebSocket channel for user cursors.
- Policy toggles defined in `policy/ai-participation.yaml` to gate AI access.
- Audit log pipeline ready to ingest collaboration events.
- Legal review of consent and data usage notifications completed.
- Load test harness for concurrent collaboration sessions (≥20 participants) configured.

**Acceptance & Exit Criteria**
- ✅ Collaboration dock passes UX review and usability study with analysts.
- ✅ Audit queries demonstrate end-to-end trace (invite → AI join → edit → commit) retrievable within 2 minutes.
- ✅ Incident simulation (provider outage) shows fallback messaging and no uncaught errors in console logs.
- ✅ Accessibility compliance validated with screen reader test + color contrast check.
- ✅ Documentation `/docs/collaboration/cloud-ide-overlay.md` explains workflows, consent, and troubleshooting.

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
- [ ] Privacy notice displayed and localized across supported languages.
- [ ] Load test report archived demonstrating 20 concurrent participants without dropped events.

---

## Phase 6 – AI Model Governance & Cost Controls
**Scope summary:** Deliver unified guardrails for AI provider usage, spend, and performance feedback.

**Implementation Blueprint**
- **Service updates:**
  - Extend `services/ai-governor/src/providers/replit.ts` & `lovable.ts` for quota enforcement.
  - Integrate with `packages/cost-guard` to compute spend anomalies and escalate via Maestro notifications.
- **Admin experience:** Build settings page `client/src/features/governance/ModelGovernanceView.tsx` with charts (Victory.js) and policy toggles.
- **Data pipeline:** Stream usage metrics into data warehouse (`analytics/airbyte` pipeline) for daily digest generation.
- **Feedback loop:** Capture acceptance/rejection metrics from Phase 2 and feed into `ai-governor` for prompt tuning suggestions.
- **Compliance:** Ensure governance decisions logged with actor, action, timestamp for audits.

**Prerequisites**
- `ai-governor` service deployed with feature flag toggles for new providers.
- Cost guard package configured with budget thresholds per workspace/team.
- Slack webhook for Maestro notifications validated in non-production.
- Data warehouse tables `ai_usage_daily` and `ai_budget_alerts` provisioned.
- Privacy review covering retention policy for suggestion telemetry.

**Acceptance & Exit Criteria**
- ✅ Governance dashboards accessible to admins only; RBAC verified via integration test.
- ✅ Daily Slack digest demonstrates spend, quota usage, anomalies, and recommended actions.
- ✅ Prompt tuning feedback stored and retrievable via `GET /governance/providers/:id/feedback` API.
- ✅ Runbook `/docs/runbooks/ai-governance-escalation.md` added with escalation ladder.
- ✅ Quarterly compliance report template updated to include Replit/Lovable usage.

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
- [ ] Slack digest pipeline includes on-call escalation when spend exceeds 90% of budget.
- [ ] Privacy/retention settings documented and enforced via automated tests.

---

## Follow-Up Backlog Ideas
- Blueprints for chaos drills simulating IDE outages and failover to local tooling.
- Prompt variants tailored for red-team exercises validating AI guardrails and incident response.
- Migration checklists and test plans when Replit or Lovable release major API version changes.
- Automated benchmarking harness comparing latency/cost between providers across representative workloads.
- Embedded analytics for prompt effectiveness and developer satisfaction surveys.
- Partner enablement kit for external teams adopting the integrations (slides, demo scripts, sandbox environment).
