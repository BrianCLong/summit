# MC Learning Module

## Overview

- **Purpose**: deliver adaptive multiple-choice (MC) learning paths inside the Mission Control (MC) experience while tracking learner mastery, remediation needs, and reporting hooks for the wider analytics stack.
- **Core Service**: `packages/mc-learning/src/services/MCLearningModuleService.ts` coordinates content scheduling, learner state transitions, scoring, and downstream event fan-out.【F:docs/modules/mc-learning-module.md†L5-L6】
- **Entry Points**: REST and websocket routes in `packages/mc-learning/src/routes/` expose session lifecycle APIs, content streaming, and instructor dashboards, with shared DTOs in `packages/mc-learning/src/types/` to keep clients and workers aligned.【F:docs/modules/mc-learning-module.md†L6-L7】
- **Storage**: relational persistence (Postgres) for learner/session state, Redis caching for active sessions, and S3-backed artifact storage for large asset bundles (explanations, rubric snippets).【F:docs/modules/mc-learning-module.md†L8-L9】
- **Observability**: emits structured telemetry via `mc-learning.session.*` and `mc-learning.assessment.*` topics for the analytics bridge and alerting policies.【F:docs/modules/mc-learning-module.md†L9-L10】

## Architecture

### Runtime Components

| Component | Responsibility |
| --- | --- |
| `MCLearningModuleService` | Orchestrates module initialization, question sequencing, adaptive difficulty, and scoring callbacks.【F:docs/modules/mc-learning-module.md†L14-L15】 |
| `ContentIngestionWorker` | Normalizes uploaded MC content packages, performs policy/PII linting, and stores compiled question banks in S3 + Postgres metadata tables.【F:docs/modules/mc-learning-module.md†L15-L16】 |
| `SessionRouter` | Express router handling REST endpoints (`/api/mc-learning/modules`, `/api/mc-learning/sessions`, `/api/mc-learning/responses`). Applies authz gateway hooks and rate limiting.【F:docs/modules/mc-learning-module.md†L16-L17】 |
| `RealtimeGateway` | Websocket bridge enabling live instructor dashboards and progress nudges; powered by Redis pub/sub channels.【F:docs/modules/mc-learning-module.md†L17-L18】 |
| `AnalyticsExporter` | Publishes granular assessment telemetry to Kafka and writes aggregates to the learning data mart.【F:docs/modules/mc-learning-module.md†L18-L19】 |

### Data & Configuration

- **Schema**: core tables `mc_learning_modules`, `mc_learning_sessions`, `mc_learning_questions`, and `mc_learning_responses` maintain module definitions, per-learner state machines, and graded outcomes. JSONB columns capture adaptive hints, rationales, and custom scoring dimensions.【F:docs/modules/mc-learning-module.md†L22-L23】
- **Caching**: Redis keys follow `mc-learning:session:<sessionId>` for hot state; TTL defaults to four hours with proactive eviction on completion or inactivity.【F:docs/modules/mc-learning-module.md†L23-L24】
- **Configuration**: `.env` keys include `MC_LEARNING_MAX_ACTIVE_SESSIONS`, `MC_LEARNING_GRADEBOOK_BUCKET`, and `MC_LEARNING_DEFAULT_DIFFICULTY`. Feature flags toggle AI-authored distractor generation and bias audit sampling.【F:docs/modules/mc-learning-module.md†L24-L25】

### Control Flows

1. **Module Publishing**
   - Operators upload a zipped module manifest to `/api/mc-learning/modules`. The ingestion worker validates metadata, ingests assets, and registers modules with `MCLearningModuleService`.【F:docs/modules/mc-learning-module.md†L28-L29】
2. **Session Initialization**
   - Clients call `POST /api/mc-learning/sessions` with learner + module identifiers. The service hydrates session state, seeds adaptive parameters, and caches ephemeral state for websocket delivery.【F:docs/modules/mc-learning-module.md†L29-L30】
3. **Question Delivery & Scoring**
   - Learner responses arrive via REST or websocket messages. The service validates attempts, scores responses using deterministic rubrics plus optional AI hints, updates progress, and emits telemetry events.【F:docs/modules/mc-learning-module.md†L30-L31】
4. **Completion & Analytics**
   - When mastery or completion thresholds are met, the service finalizes the session, persists summary statistics, and pushes gradebook exports to the analytics bridge/S3 bucket.【F:docs/modules/mc-learning-module.md†L31-L32】

## APIs

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/mc-learning/modules` | `POST` | Uploads module manifests + assets; returns module id and validation report.【F:docs/modules/mc-learning-module.md†L36-L37】 |
| `/api/mc-learning/modules/:moduleId` | `GET` | Fetches module metadata, question counts, adaptive flags, and publishing status for dashboards.【F:docs/modules/mc-learning-module.md†L37-L38】 |
| `/api/mc-learning/sessions` | `POST` | Creates learner sessions, returns session token, first question payload, and websocket channel name.【F:docs/modules/mc-learning-module.md†L38-L39】 |
| `/api/mc-learning/sessions/:sessionId` | `GET` | Retrieves active session state, progress metrics, and pending actions for instructor review.【F:docs/modules/mc-learning-module.md†L39-L40】 |
| `/api/mc-learning/responses` | `POST` | Submits learner responses; returns scoring detail, feedback text, and next-step instructions.【F:docs/modules/mc-learning-module.md†L40-L41】 |
| `/api/mc-learning/reports/:sessionId` | `GET` | Streams finalized gradebook exports and analytics snapshots in NDJSON for downstream tooling.【F:docs/modules/mc-learning-module.md†L41-L42】 |

## Usage & Integration

1. Install workspace dependencies (`npm install` at repo root), then bootstrap module-specific fixtures with `npm run seed -- --scope=mc-learning` to preload demo content.【F:docs/modules/mc-learning-module.md†L45-L46】
2. Mount the router inside the MC gateway: `app.use('/api/mc-learning', mcLearningRouter({ service: new MCLearningModuleService(...) }));`.【F:docs/modules/mc-learning-module.md†L46-L47】
3. Subscribe to `mc-learning.session.completed` Kafka topic to synchronize downstream analytics or certification pipelines.【F:docs/modules/mc-learning-module.md†L47-L48】
4. Configure websocket gateway to forward `mc-learning` channels to instructor dashboards and nudge services.【F:docs/modules/mc-learning-module.md†L48-L49】

## Testing & Coverage

- Run isolated tests with `npm run test -- --scope=mc-learning`. This invokes the module’s Jest project, stubbing Kafka/Redis while exercising REST + websocket flows.【F:docs/modules/mc-learning-module.md†L52-L53】
- Coverage thresholds (statements 90%, branches 85%, lines 90%, functions 88%) are enforced in `packages/mc-learning/jest.config.ts`; CI fails if the suite drops below these values.【F:docs/modules/mc-learning-module.md†L53-L54】
- Contract tests reside in `packages/mc-learning/tests/contracts/` and validate compatibility with analytics exporters and policy enforcement service mocks.【F:docs/modules/mc-learning-module.md†L54-L55】

## Operational Readiness

- **Alerts**: `mc-learning` specific Grafana dashboards monitor active sessions, grading latency, and ingestion errors; SLO budget alerts hook into PagerDuty with `mc-learning` tags.【F:docs/modules/mc-learning-module.md†L58-L59】
- **Feature Flags**: `mc-learning-adaptive-mode`, `mc-learning-ai-distractors`, and `mc-learning-bias-audit` controlled via LaunchDarkly and default off in staging.【F:docs/modules/mc-learning-module.md†L59-L60】
- **Backfills**: Use `npm run mc-learning:backfill -- --module <id>` to recalculate mastery metrics when scoring rubrics change.【F:docs/modules/mc-learning-module.md†L60-L61】
- **Tech Debt**: Legacy YAML workflows remain excluded from Prettier while they await schema clean-up; track follow-up in the backlog item `MC-4821` (Formatting debt).【F:docs/modules/mc-learning-module.md†L61-L62】

