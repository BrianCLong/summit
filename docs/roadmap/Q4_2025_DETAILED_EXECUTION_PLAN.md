# Q4 2025 Detailed Execution Plan (Nov-Dec 2025)

**Quarter Goal:** Launch Policy Intelligence v1, Inventory Graph UI v1, SOAR v1.4, Intel v4 while retiring critical technical debt

**Capacity:** 8 working days (holiday-adjusted), 30 committed points + 6 stretch points

---

## Epic AA: Policy Intelligence v1 (10 points)

### AA1: Change-Risk Scoring Engine (4 points)

**Owner:** Platform Security Team
**Priority:** P0 (Must-Have)
**Sprint:** Nov 17-28, 2025

**User Stories:**

**AA1.1** - Risk Score Calculation (2 pts)
```
AS a platform administrator
I WANT policy changes to receive an automated risk score 0-100
SO THAT I can understand the blast radius before applying changes

Acceptance Criteria:
- [ ] Risk scoring engine calculates based on 5 factors:
  - Blast radius (# of affected resources)
  - Privilege elevation (RBAC scope changes)
  - Past incident correlation (historical failures)
  - Policy type (RBAC > network > data)
  - Change velocity (frequency of recent changes)
- [ ] Score formula: weighted sum with configurable weights
- [ ] Default weights: blast_radius=30, privilege=25, incidents=20, type=15, velocity=10
- [ ] API endpoint: POST /api/policy/risk-score
- [ ] Response includes: score, breakdown, recommendations
- [ ] Unit tests: 95% coverage on scoring logic
- [ ] Integration test: 20 sample policies with known risk profiles

Technical Design:
- Service: server/src/services/PolicyRiskService.ts
- Models: server/src/models/PolicyChange.ts
- Database: Add policy_changes table (PostgreSQL)
- Schema: id, policy_id, change_type, risk_score, factors_json, created_at
```

**AA1.2** - Preview & Impact Analysis (2 pts)
```
AS a platform administrator
I WANT to preview policy changes before applying
SO THAT I can verify intended vs. actual impact

Acceptance Criteria:
- [ ] Preview endpoint: POST /api/policy/preview
- [ ] Dry-run policy application against current state
- [ ] Return: affected_resources[], permission_deltas[], risk_score
- [ ] UI shows side-by-side comparison (current vs. proposed)
- [ ] "Approve" button disabled if risk_score > 80 (configurable threshold)
- [ ] Approval workflow for scores 60-80
- [ ] Auto-approve for scores < 60 (with audit trail)
- [ ] Preview includes: affected users, roles, resources, permissions
- [ ] E2E test: preview RBAC change, verify accuracy

Technical Design:
- Component: client/src/components/PolicyPreview.tsx
- Hook: usePolicyPreview() with preview state management
- Validation: Compare preview results vs. actual application in test env
```

**Dependencies:**
- OPA policy evaluation engine (already in codebase)
- RBAC/ABAC audit logs accessible
- Policy versioning system

**Risks & Mitigations:**
- **Risk:** Scoring model mis-classifies high-risk change as low-risk
- **Mitigation:** Conservative default weights, manual gate for score >60, canary testing on historical incidents

---

### AA2: Drift Detection + Rollback (4 points)

**Owner:** Platform SRE Team
**Priority:** P0 (Must-Have)
**Sprint:** Nov 17-28, 2025

**User Stories:**

**AA2.1** - Continuous Drift Detection (2 pts)
```
AS a security operator
I WANT automated detection of policy drift from approved baseline
SO THAT unauthorized changes are caught within 5 minutes

Acceptance Criteria:
- [ ] Drift detector runs every 2 minutes (configurable interval)
- [ ] Compares current policy state vs. approved baseline (stored in policy_versions table)
- [ ] Detects changes in: RBAC roles, permissions, network policies, data access rules
- [ ] Alert triggers on any delta detection
- [ ] MTTA (Mean Time To Alert) ≤ 5 minutes
- [ ] Alert includes: diff, change timestamp, suspected actor, rollback link
- [ ] Slack/Email notifications to #security-alerts channel
- [ ] Dashboard widget showing drift status (green/red)
- [ ] Synthetic test: inject unauthorized policy change, verify alert fires

Technical Design:
- Service: server/src/services/PolicyDriftDetector.ts
- Scheduler: Cron job (node-cron) every 2 minutes
- Storage: policy_baselines table (id, policy_type, baseline_json, approved_at)
- Comparison: Deep diff algorithm (fast-json-patch library)
- Alerting: Integrate with existing NotificationService
```

**AA2.2** - One-Click Rollback (2 pts)
```
AS a security operator
I WANT to rollback policy changes with one click
SO THAT I can rapidly remediate drift or misconfigurations

Acceptance Criteria:
- [ ] Rollback endpoint: POST /api/policy/rollback
- [ ] Parameters: policy_id, target_version (defaults to last approved)
- [ ] Rollback executes within 30 seconds
- [ ] Immutable audit trail: rollback logged with actor, timestamp, reason
- [ ] UI button in drift alert: "Rollback Now"
- [ ] Confirmation modal: "This will revert policy X to version Y from [timestamp]. Proceed?"
- [ ] Post-rollback verification: drift detector confirms clean state
- [ ] Success notification: "Policy rolled back successfully"
- [ ] Failure handling: If rollback fails, escalate to on-call, preserve evidence
- [ ] E2E test: Trigger drift, click rollback, verify original state restored

Technical Design:
- Service: server/src/services/PolicyRollbackService.ts
- Transaction: Atomic rollback with PostgreSQL transaction
- Verification: Post-rollback drift check
- Audit: policy_audit_log table (id, action, policy_id, actor_id, before_json, after_json, timestamp)
```

**Dependencies:**
- Policy versioning system with immutable history
- OPA policy reload mechanism
- Notification system (Slack/Email integrations)

**Risks & Mitigations:**
- **Risk:** Rollback breaks dependent policies (cascading failure)
- **Mitigation:** Dependency graph analysis pre-rollback, warn user of impacts
- **Risk:** Drift detector false positives (alert fatigue)
- **Mitigation:** Tunable sensitivity, whitelist for known-safe changes

---

### AA3: Notifications & UX (2 points)

**Owner:** Product Engineering
**Priority:** P1 (Should-Have)
**Sprint:** Nov 17-28, 2025

**User Stories:**

**AA3.1** - Multi-Channel Notifications (1 pt)
```
AS a policy approver
I WANT to receive policy change notifications via Slack and Email
SO THAT I can review and approve high-risk changes promptly

Acceptance Criteria:
- [ ] Slack integration: POST to webhook with rich message
- [ ] Email integration: SendGrid/SES template
- [ ] Message includes: Policy name, risk score, preview link, approve/reject buttons
- [ ] Slack message format: Card with color coding (green <60, yellow 60-80, red >80)
- [ ] Email format: HTML template with inline preview
- [ ] "Approve" button links to approval UI with pre-filled context
- [ ] Notification preferences: User can configure channels (Slack only, Email only, Both)
- [ ] Rate limiting: Max 1 notification per policy per 10 minutes
- [ ] Integration test: Mock Slack webhook, verify payload

Technical Design:
- Service: server/src/services/NotificationService.ts (extend existing)
- Templates: server/src/templates/policy-change-notification.html
- Config: .env variables for SLACK_WEBHOOK_URL, EMAIL_FROM_ADDRESS
```

**AA3.2** - Approval Dashboard & Kill Switch (1 pt)
```
AS a security lead
I WANT a centralized dashboard showing pending policy approvals
SO THAT I can manage policy governance at scale

Acceptance Criteria:
- [ ] Dashboard route: /admin/policy-approvals
- [ ] Table columns: Policy Name, Risk Score, Submitter, Timestamp, Status, Actions
- [ ] Filters: Risk level, Status (pending/approved/rejected), Date range
- [ ] Bulk actions: Approve selected, Reject selected
- [ ] "Kill Switch" button: Freeze all policy changes (emergency mode)
- [ ] Kill switch confirmation: "This will block all policy changes until re-enabled. Proceed?"
- [ ] Kill switch UI: Red banner at top "POLICY FREEZE ACTIVE - All changes blocked"
- [ ] Re-enable button: "Resume Policy Changes"
- [ ] Audit: Kill switch activation/deactivation logged
- [ ] E2E test: Activate kill switch, attempt policy change, verify blocked

Technical Design:
- Component: client/src/pages/Admin/PolicyApprovals.tsx
- Store: Redux slice for policy approval state
- Kill Switch: Global flag in Redis (policy_freeze_enabled: true/false)
- Middleware: Check kill switch in PolicyChangeMiddleware before applying
```

**Dependencies:**
- Slack workspace webhook configured
- Email service (SendGrid/SES) credentials
- Admin UI framework (Material-UI tables)

**Risks & Mitigations:**
- **Risk:** Notification spam during high-velocity change periods
- **Mitigation:** Rate limiting, batching, digest mode
- **Risk:** Kill switch accidentally activated (operational disruption)
- **Mitigation:** Confirmation modal, audit trail, restricted to security leads only

---

## Epic AB: Inventory Graph UI v1 (8 points)

### AB1: Graph Service & API (3 points)

**Owner:** Backend Infrastructure Team
**Priority:** P0 (Must-Have)
**Sprint:** Nov 17-28, 2025

**User Stories:**

**AB1.1** - Entity Graph Data Model (1.5 pts)
```
AS a backend developer
I WANT a graph data model representing inventory entities and relationships
SO THAT the UI can query and visualize entity context

Acceptance Criteria:
- [ ] Neo4j schema: Nodes (Host, User, Account, Asset, Service, Network)
- [ ] Relationships: OWNS, MANAGES, ACCESSES, CONNECTS_TO, PART_OF
- [ ] Node properties: id, type, name, labels[], metadata{}, created_at, updated_at
- [ ] Edge properties: relationship_type, confidence_score, first_seen, last_seen
- [ ] Indexes: CREATE INDEX ON :Host(id), :User(email), :Account(account_id)
- [ ] Constraints: UNIQUE constraint on entity IDs
- [ ] Migration script: server/src/db/migrations/009_inventory_graph_schema.ts
- [ ] Seed script: Populate 1000 sample entities for testing
- [ ] Query performance: <100ms for 1-hop queries, <500ms for 3-hop queries

Technical Design:
- Migration: Use Neo4j Cypher via neo4j-driver
- Sample query: MATCH (h:Host)-[:OWNS]->(u:User) WHERE h.id = $hostId RETURN h, u
- Performance: EXPLAIN/PROFILE queries, add indexes where needed
```

**AB1.2** - Graph Query API (1.5 pts)
```
AS a frontend developer
I WANT a GraphQL API to query entity relationships
SO THAT I can build interactive graph visualizations

Acceptance Criteria:
- [ ] GraphQL schema: server/src/graphql/schema/inventoryGraph.graphql
- [ ] Query: entityGraph(entityId: ID!, depth: Int = 2): EntityGraph
- [ ] Type EntityGraph { nodes: [EntityNode!]!, edges: [EntityEdge!]! }
- [ ] Type EntityNode { id: ID!, type: EntityType!, name: String!, metadata: JSON }
- [ ] Type EntityEdge { from: ID!, to: ID!, type: RelationshipType!, confidence: Float }
- [ ] Pagination: Support cursor-based pagination for large graphs
- [ ] Filtering: Filter by entity type, relationship type, confidence threshold
- [ ] Performance: Query optimization to avoid N+1 queries
- [ ] Authorization: Respect RBAC - users only see entities they have permission to view
- [ ] Unit tests: 90% resolver coverage
- [ ] Integration test: Query graph for test entity, verify structure

Technical Design:
- Resolver: server/src/graphql/resolvers/inventoryGraphResolver.ts
- Service: server/src/services/InventoryGraphService.ts
- Neo4j query builder with parameterized queries (prevent injection)
- Caching: Redis cache for frequently accessed graph fragments (TTL: 5 minutes)
```

**Dependencies:**
- Neo4j database accessible (already in stack)
- GraphQL server configured (Apollo Server v4)
- RBAC middleware for entity-level permissions

**Risks & Mitigations:**
- **Risk:** Graph queries too slow for large subgraphs (>10k nodes)
- **Mitigation:** Depth limiting (max 3 hops), pagination, caching, indexes
- **Risk:** Permission checks slow down queries
- **Mitigation:** Batch permission checks, cache user permissions in Redis

---

### AB2: UI Panel in Alert View (3 points)

**Owner:** Frontend Team
**Priority:** P0 (Must-Have)
**Sprint:** Nov 17-28, 2025

**User Stories:**

**AB2.1** - Graph Visualization Component (2 pts)
```
AS an analyst
I WANT to see a graph visualization of entities related to an alert
SO THAT I can understand attack surface and relationships

Acceptance Criteria:
- [ ] Component: client/src/components/InventoryGraph/GraphPanel.tsx
- [ ] Library: Cytoscape.js with cytoscape-cose-bilkent layout
- [ ] Initial render: Center on alert entity, show 2-hop neighborhood
- [ ] Node rendering: Color-coded by type (Host=blue, User=green, Account=yellow, etc.)
- [ ] Edge rendering: Thickness by confidence score, dashed for low confidence (<0.5)
- [ ] Interactivity: Click node to expand neighbors, double-click to navigate to entity page
- [ ] Tooltips: Hover shows entity metadata (name, type, key properties)
- [ ] Controls: Zoom, pan, reset view, layout selector (cose, circle, grid)
- [ ] Loading state: Skeleton loader while fetching graph data
- [ ] Empty state: "No related entities found" with helpful message
- [ ] Performance: Render 500 nodes/edges smoothly (60fps), virtualize beyond that
- [ ] Accessibility: Keyboard navigation, ARIA labels

Technical Design:
- Hook: useInventoryGraph(alertId, depth) for data fetching
- State: GraphQL query with loading/error/data states
- Layout: Cose-Bilkent for hierarchical layouts (nice for attack paths)
- Styling: MUI theme integration for consistent colors
```

**AB2.2** - Attack Path Preview (1 pt)
```
AS an analyst
I WANT to see potential attack paths highlighted in the graph
SO THAT I can prioritize remediation

Acceptance Criteria:
- [ ] Feature: "Show Attack Paths" toggle button
- [ ] Algorithm: Shortest path from alert entity to high-value targets (labeled "critical_asset")
- [ ] Visualization: Highlight path edges in red, path nodes with red border
- [ ] Tooltip on path: "Potential attack path: [Entity A] → [Entity B] → [Critical Asset]"
- [ ] Multiple paths: Show top 3 highest-risk paths
- [ ] Risk scoring: Path risk = sum of edge confidence scores
- [ ] Read-only in v1: No remediation actions, just visualization
- [ ] Performance: Path calculation <500ms for graphs with <1000 nodes
- [ ] E2E test: Load alert with known attack path, verify highlighting

Technical Design:
- Algorithm: Dijkstra's shortest path (client-side for v1, server-side for v2)
- Library: cytoscape-algorithms extension
- Criteria: High-value targets have tag "criticality:high" in metadata
```

**Dependencies:**
- Cytoscape.js library (already in client package.json)
- Graph API delivering entity data
- Entity criticality metadata (labeled in graph)

**Risks & Mitigations:**
- **Risk:** Graph too dense, visualization unusable
- **Mitigation:** Depth limiting, filtering, clustering nodes by type
- **Risk:** Attack path algorithm too slow
- **Mitigation:** Pre-compute paths server-side for large graphs, cache results

---

### AB3: Ownership Context (2 points)

**Owner:** Frontend Team
**Priority:** P1 (Should-Have)
**Sprint:** Nov 17-28, 2025

**User Stories:**

**AB3.1** - Ownership Metadata Display (1 pt)
```
AS an analyst
I WANT to see ownership information for each entity
SO THAT I can contact the right team for remediation

Acceptance Criteria:
- [ ] Entity metadata includes: owner_email, owner_team, sla_tier, support_url
- [ ] UI: Info panel on node click shows ownership details
- [ ] Fields: Owner, Team, Contact, SLA Tier, Last Updated
- [ ] "Contact Owner" button: Opens email client with pre-filled subject/body
- [ ] Email template: "Alert #[ID] affects your asset [Entity Name]. Please review."
- [ ] "View Runbook" link: Opens support_url in new tab (if present)
- [ ] Fallback: If no owner, show "Unknown - Update in CMDB"
- [ ] E2E test: Click node, verify ownership panel renders

Technical Design:
- Panel: client/src/components/InventoryGraph/OwnershipPanel.tsx
- Data source: Entity metadata from graph API
- Email: mailto: link generation
```

**AB3.2** - Export Visualization (1 pt)
```
AS an analyst
I WANT to export the graph visualization as PNG
SO THAT I can include it in reports and presentations

Acceptance Criteria:
- [ ] Export button: "Export as PNG" in graph controls
- [ ] Function: Captures current graph view (zoom/pan state preserved)
- [ ] Resolution: High-res PNG (2x device pixel ratio)
- [ ] Filename: alert-[id]-graph-[timestamp].png
- [ ] Download: Triggers browser download
- [ ] Watermark: Small "IntelGraph" watermark in corner
- [ ] Unit test: Mock canvas export, verify function called

Technical Design:
- Library: cytoscape.js png() method
- Implementation: cy.png({ output: 'blob', scale: 2 })
- Download: Create temporary <a> element, trigger click
```

**Dependencies:**
- Entity metadata populated in graph (owner, team fields)
- Cytoscape.js export capabilities

**Risks & Mitigations:**
- **Risk:** Ownership data incomplete or stale
- **Mitigation:** CMDB sync process, data quality metrics, "last updated" timestamps

---

## Epic AC: SOAR v1.4 Scale & Safety (8 points)

### AC1: Bulk Incident Operations + Queues (4 points)

**Owner:** Automation Platform Team
**Priority:** P0 (Must-Have)
**Sprint:** Nov 17-28, 2025

**User Stories:**

**AC1.1** - Bulk Operations API (2 pts)
```
AS a SOAR operator
I WANT to perform bulk actions on multiple incidents
SO THAT I can efficiently manage high-volume incident queues

Acceptance Criteria:
- [ ] API: POST /api/soar/bulk-action
- [ ] Body: { action: 'close' | 'tag' | 'assign', incident_ids: string[], params: {} }
- [ ] Idempotency: Duplicate requests don't cause errors (idempotency key header)
- [ ] Response: { job_id: string, status: 'queued', total: number }
- [ ] Status endpoint: GET /api/soar/bulk-action/:job_id
- [ ] Status response: { status: 'in_progress' | 'completed' | 'failed', progress: { completed: N, failed: M, total: X }, errors: [] }
- [ ] Actions supported:
  - close: Close incidents with reason
  - tag: Add/remove tags
  - assign: Assign to user/team
- [ ] Batch size limit: Max 1000 incidents per request
- [ ] Rate limiting: Max 5 concurrent bulk jobs per user
- [ ] Integration test: Submit bulk close 100 incidents, verify all processed

Technical Design:
- Queue: BullMQ (Redis-backed job queue)
- Worker: server/src/workers/BulkActionWorker.ts
- Schema: bulk_jobs table (id, user_id, action, params, status, progress, created_at)
- Idempotency: Store idempotency_key in Redis with 24h TTL
```

**AC1.2** - Queue Management & Retries (2 pts)
```
AS a platform operator
I WANT bulk operations to be resilient with retries and backoff
SO THAT transient failures don't cause data loss

Acceptance Criteria:
- [ ] Retry logic: Exponential backoff (1s, 2s, 4s, 8s, 16s)
- [ ] Max retries: 5 attempts per incident action
- [ ] Circuit breaker: If failure rate >20%, pause queue for 5 minutes
- [ ] Failure isolation: One failed incident doesn't block entire batch
- [ ] Dead letter queue: Failed incidents after max retries go to DLQ for manual review
- [ ] Observability: Prometheus metrics (queue_depth, processing_rate, error_rate)
- [ ] Dashboard: Grafana panel showing queue health (active, completed, failed, DLQ size)
- [ ] Alerting: PagerDuty alert if DLQ size >100 or error rate >10%
- [ ] Chaos test: Inject 20% random failures, verify retries work

Technical Design:
- BullMQ retry configuration: { attempts: 5, backoff: { type: 'exponential', delay: 1000 } }
- Circuit breaker: Custom middleware checking Redis counter
- Metrics: server/src/metrics/SoarMetrics.ts (Prometheus client)
- DLQ: BullMQ failed queue with separate consumer
```

**Dependencies:**
- Redis instance for BullMQ (already in stack)
- SOAR action handlers (close, tag, assign functions)
- Prometheus/Grafana configured

**Risks & Mitigations:**
- **Risk:** Queue overwhelmed during bulk operations (memory exhaustion)
- **Mitigation:** Rate limits, backpressure, queue depth alerts
- **Risk:** Partial failures leave incidents in inconsistent state
- **Mitigation:** Transaction logging, rollback support, manual reconciliation tools

---

### AC2: Parallelization + Circuit Breakers (4 points)

**Owner:** Automation Platform Team
**Priority:** P0 (Must-Have)
**Sprint:** Nov 17-28, 2025

**User Stories:**

**AC2.1** - Parallel Step Execution (2 pts)
```
AS a SOAR playbook author
I WANT playbook steps to execute in parallel where dependencies allow
SO THAT playbooks complete 25% faster

Acceptance Criteria:
- [ ] Playbook DAG: Parse playbook YAML, build dependency graph
- [ ] Parallelization: Execute independent steps concurrently (Promise.allSettled)
- [ ] Max concurrency: Configurable limit (default 10 parallel steps)
- [ ] Dependency resolution: Step only runs after all upstream steps complete
- [ ] Error isolation: Failed step doesn't block unrelated parallel steps
- [ ] Audit: Log shows parallel execution (timestamps prove concurrency)
- [ ] Example: Enrichment steps (query OSINT, check IP reputation, lookup domain) run in parallel
- [ ] Performance test: Playbook with 10 parallel steps completes in ~10s vs. 100s sequential
- [ ] Unit test: DAG builder correctly identifies parallel vs. sequential steps

Technical Design:
- Playbook format: YAML with dependencies[] field per step
- DAG builder: server/src/soar/PlaybookDAG.ts (topological sort)
- Executor: server/src/soar/PlaybookExecutor.ts (Promise.allSettled for parallel groups)
- Concurrency: p-limit library for controlling max concurrent promises
```

**AC2.2** - Per-Step Circuit Breakers (2 pts)
```
AS a SOAR operator
I WANT circuit breakers on each playbook step
SO THAT failing steps don't cascade and block entire automation

Acceptance Criteria:
- [ ] Circuit breaker per step type (e.g., "query_osint", "block_ip")
- [ ] States: CLOSED (normal), OPEN (failing, skip step), HALF_OPEN (testing recovery)
- [ ] Thresholds: Open circuit if error rate >30% over 1 minute window
- [ ] Timeout: Per-step timeout (default 30s, configurable)
- [ ] Fallback: On circuit open or timeout, mark step as "skipped", continue playbook
- [ ] Recovery: After 2 minutes in OPEN, try HALF_OPEN (test with 1 request)
- [ ] Observability: Metrics (circuit_state, step_error_rate, step_duration_p95)
- [ ] Alerts: Slack notification when circuit opens (critical step failure)
- [ ] Replay: "Retry failed branch" button in UI to re-execute just the failed steps
- [ ] Integration test: Inject failing step, verify circuit opens, verify fallback works

Technical Design:
- Library: opossum (Node.js circuit breaker library)
- Config: server/src/soar/circuitBreakers.ts (per-step configurations)
- Metrics: Integrate with Prometheus (circuit_breaker_state gauge)
- Retry UI: client/src/components/Soar/PlaybookRetry.tsx
```

**Dependencies:**
- Playbook YAML schema with dependencies support
- SOAR step execution framework
- Prometheus metrics infrastructure

**Risks & Mitigations:**
- **Risk:** Complex dependency graphs cause deadlocks
- **Mitigation:** Cycle detection in DAG builder, fail-fast on cycles
- **Risk:** Circuit breaker false positives (temporary blips open circuit)
- **Mitigation:** Tunable thresholds, monitoring dashboard, manual override

---

## Epic AD: Intel v4 (Active Learning Beta) (4 points)

### AD1: Feedback Capture + Labeling (2 points)

**Owner:** ML Platform Team
**Priority:** P1 (Should-Have)
**Sprint:** Nov 17-28, 2025

**User Stories:**

**AD1.1** - Inline Feedback UI (1 pt)
```
AS an analyst
I WANT to provide feedback on AI-generated insights
SO THAT the model improves over time

Acceptance Criteria:
- [ ] Feedback widget: Thumbs up/down buttons on each AI insight card
- [ ] Reason dropdown: "Accurate", "Inaccurate", "Misleading", "Incomplete", "Other"
- [ ] Free text: Optional comment field (max 500 chars)
- [ ] Submit feedback: POST /api/intel/feedback
- [ ] Confirmation: "Thank you for your feedback!" toast notification
- [ ] Privacy: Feedback doesn't include PII, sanitize user comments
- [ ] Telemetry: Track feedback rate (% of insights rated)
- [ ] E2E test: Rate insight, verify feedback stored

Technical Design:
- Component: client/src/components/Intel/InsightFeedback.tsx
- API: server/src/graphql/mutations/submitIntelFeedback.ts
- Storage: intel_feedback table (id, insight_id, user_id, rating, reason, comment, created_at)
```

**AD1.2** - Label Store & Privacy (1 pt)
```
AS a data scientist
I WANT feedback data stored in a structured format
SO THAT I can use it for model retraining

Acceptance Criteria:
- [ ] Database: PostgreSQL table intel_feedback (see above schema)
- [ ] Indexes: CREATE INDEX ON intel_feedback(insight_id, rating)
- [ ] Export API: GET /api/intel/feedback/export (CSV format, admin-only)
- [ ] Privacy review: No PII in feedback (user_id only, not email/name)
- [ ] Retention: Feedback data retained 12 months (configurable)
- [ ] Sampling: Random sample 10% of feedback for monthly review (data quality)
- [ ] Analytics: Dashboard showing feedback distribution (thumbs up vs. down, reasons)
- [ ] Integration test: Submit 100 feedback samples, export, verify format

Technical Design:
- Migration: server/src/db/migrations/010_intel_feedback.ts
- Export: server/src/services/IntelFeedbackExportService.ts
- Dashboard: Grafana panel using PostgreSQL datasource
```

**Dependencies:**
- AI insights already being generated (Intel v3 in production)
- Privacy/legal approval for feedback collection
- PostgreSQL accessible

**Risks & Mitigations:**
- **Risk:** Low feedback rate (analysts don't engage)
- **Mitigation:** Gamification (leaderboard), reminders, make it quick (<5s)
- **Risk:** Feedback contains sensitive data
- **Mitigation:** Sanitization pipeline, regex filters, privacy review

---

### AD2: Batch Retrain Pipeline + Canary (2 points)

**Owner:** ML Platform Team
**Priority:** P1 (Should-Have)
**Sprint:** Nov 17-28, 2025

**User Stories:**

**AD2.1** - Batch Retraining Pipeline (1 pt)
```
AS a data scientist
I WANT an automated pipeline to retrain the Intel model with feedback data
SO THAT the model continuously improves

Acceptance Criteria:
- [ ] Cron job: Weekly batch retrain (every Sunday 2am UTC)
- [ ] Data: Fetch intel_feedback from last 7 days (min 100 samples required)
- [ ] Training: Fine-tune model on feedback data (supervised learning)
- [ ] Validation: Evaluate on holdout set (20% of feedback data)
- [ ] Metrics: Brier score, PR-AUC, calibration plot
- [ ] Model registry: Save model as v4.1, v4.2, etc. (versioned in MLflow/S3)
- [ ] Success criteria: New model Brier score ≤ previous version
- [ ] Failure handling: If new model worse, keep previous version, alert team
- [ ] Logging: Training logs saved to logs/intel-retrain-[timestamp].log
- [ ] Notification: Slack message with training summary (metrics, version)
- [ ] Integration test: Mock training job, verify model saved to registry

Technical Design:
- Script: server/src/ml/trainIntelModel.ts
- Scheduler: node-cron or Kubernetes CronJob
- Model storage: S3 bucket s3://intelgraph-models/intel/v4/
- Registry: MLflow tracking server (or simple metadata in PostgreSQL)
```

**AD2.2** - Canary Deployment (1 pt)
```
AS a platform operator
I WANT new Intel models deployed to canary set first
SO THAT regressions are caught before full rollout

Acceptance Criteria:
- [ ] Canary group: 10% of users (randomly selected, sticky by user_id hash)
- [ ] Feature flag: intel_model_version (values: v3, v4.1, v4.2, etc.)
- [ ] Canary duration: 48 hours of monitoring before promoting to 100%
- [ ] Metrics: Track Brier score, override rate, feedback rate for canary vs. control
- [ ] Promotion criteria:
  - Canary Brier score ≤ control + 0.02
  - Override rate ≤ control + 5%
  - No critical bugs reported
- [ ] Rollback: One-click rollback to previous version
- [ ] Export to detections: Only promote model if passes canary
- [ ] Dashboard: Side-by-side comparison (canary vs. control metrics)
- [ ] E2E test: Deploy canary model, verify 10% traffic split

Technical Design:
- Feature flag service: LaunchDarkly or custom (Redis-based)
- Canary logic: server/src/services/IntelModelService.ts (user_id % 10 === 0 ? canary : control)
- Metrics: Prometheus with canary label (intel_brier_score{version="v4.1", cohort="canary"})
- Dashboard: Grafana comparison panel
```

**Dependencies:**
- Intel v3 model in production
- MLflow or model registry system
- Feature flag service
- Sufficient feedback data (≥100 samples/week)

**Risks & Mitigations:**
- **Risk:** Insufficient feedback data for meaningful retraining
- **Mitigation:** Seed with synthetic examples, combine with external datasets
- **Risk:** Canary model causes bad user experience
- **Mitigation:** Quick rollback SLA (<10 min), automated safety checks

---

## Epic AE: Observability & Enablement (2 points)

### AE1: Dashboards, Alerts, Runbooks (2 points)

**Owner:** SRE Team
**Priority:** P0 (Must-Have)
**Sprint:** Nov 17-28, 2025

**User Stories:**

**AE1.1** - Grafana Dashboards (1 pt)
```
AS an SRE
I WANT Grafana dashboards for all new Q4 features
SO THAT I can monitor health and performance

Acceptance Criteria:
- [ ] Dashboard: Policy Intelligence (monitoring/grafana/dashboards/policy-intelligence.json)
  - Panels: Risk score distribution, drift alerts fired, rollback count, approval latency
- [ ] Dashboard: Inventory Graph (monitoring/grafana/dashboards/inventory-graph.json)
  - Panels: Graph query latency P95, nodes/edges served, cache hit rate, error rate
- [ ] Dashboard: SOAR v1.4 (monitoring/grafana/dashboards/soar-v14.json)
  - Panels: Bulk job throughput, queue depth, circuit breaker states, DLQ size
- [ ] Dashboard: Intel v4 (monitoring/grafana/dashboards/intel-v4.json)
  - Panels: Brier score (canary vs. control), feedback rate, model inference latency
- [ ] Auto-provisioning: Dashboards loaded on Grafana startup (docker-compose volume mount)
- [ ] Variables: Environment selector (dev, staging, prod)
- [ ] Annotations: Deployment markers (show when new versions deployed)

Technical Design:
- Dashboard JSONs: Export from Grafana UI, commit to repo
- Provisioning: observability/grafana/provisioning/dashboards/dashboards.yml
- Data sources: Prometheus (metrics), PostgreSQL (business data)
```

**AE1.2** - Alerts & Runbooks (1 pt)
```
AS an on-call engineer
I WANT alerts with actionable runbooks
SO THAT I can quickly resolve incidents

Acceptance Criteria:
- [ ] Prometheus alerts: observability/prometheus/alerts/q4-2025-alerts.yml
  - PolicyDriftNotResolved (alert if drift detected >10 min ago, no rollback)
  - GraphAPIHighLatency (alert if P95 >1s for 5 minutes)
  - SoarDLQBacklog (alert if DLQ size >100)
  - IntelModelDegraded (alert if canary Brier >0.20)
- [ ] Alert routing: AlertManager config (route to Slack #on-call, PagerDuty for critical)
- [ ] Runbooks: docs/runbooks/ (one per alert)
  - Structure: Symptom, Impact, Diagnosis steps, Resolution steps, Escalation
  - Example: docs/runbooks/POLICY_DRIFT_NOT_RESOLVED.md
- [ ] Chaos drills: Monthly drill checklist (simulate each alert, practice runbook)
- [ ] Runbook links: Alerts include runbook URL in message

Technical Design:
- Alerts file: observability/prometheus/alerts/q4-2025-alerts.yml
- AlertManager: observability/alertmanager/config.yml (Slack/PagerDuty integrations)
- Runbooks: Markdown docs with standardized template
```

**Dependencies:**
- Prometheus configured with all new metrics
- Grafana accessible
- AlertManager + Slack/PagerDuty integrations

**Risks & Mitigations:**
- **Risk:** Alert fatigue (too many noisy alerts)
- **Mitigation:** Tune thresholds based on first week, use for loops for repeat alerts
- **Risk:** Runbooks become stale
- **Mitigation:** Monthly runbook review, test during chaos drills

---

## Technical Debt Retirement (Parallel Track)

### Critical TODO Sweep (30% of Q4 capacity)

**Owner:** Entire Engineering Team (distributed)
**Priority:** P0
**Sprint:** Nov 17-Dec 20, 2025

**Scope:**
- **Target:** Close all TODOs in auth/RBAC, policy enforcement, SOAR critical paths
- **Method:** Each engineer claims 5-10 TODOs per sprint
- **Tracking:** GitHub Project board "Q4 TODO Cleanup" (columns: Backlog, In Progress, Done)
- **Definition of Done:** TODO resolved (implemented or converted to tracked issue), tests pass

**High-Priority TODO Items from TECH_DEBT_TRACKER.md:**

1. **gateway/src/index.ts:87** - Implement admin-only check
2. **server/src/conductor/admission/budget-control.ts:179** - Track per-expert request counts
3. **client/src/components/dashboard/LiveActivityFeed.tsx:24** - Re-enable GraphQL subscription
4. **server/server.ts:21** - Implement health check DB/queue ping
5. **server/src/claims/sign.ts:18** - Reuse MerkleLog for root computation
6. **apps/gateway/src/rbac/scim.ts:2** - Implement SCIM sync using IdP API
7. **tests/unit/dlp.test.ts:337** - Implement GraphQL variables DLP scanning test

**Process:**
1. Daily standup: Each engineer reports TODO progress
2. Code review: No PR merges with new TODOs (enforced by dangerfile.js)
3. Weekly metrics: TODOs closed count, % reduction

**Success Criteria:**
- ≥100 TODOs closed in Q4 (50% reduction from 200)
- 0 new TODOs introduced in Q4 features
- Critical paths (auth, RBAC, policy) 100% TODO-free by Dec 20

---

## Definition of Done (Q4 2025)

**Feature DoD:**
- [ ] Unit tests ≥90% coverage for new code
- [ ] Integration tests for all APIs
- [ ] E2E test for critical user paths
- [ ] Grafana dashboard panel added
- [ ] Prometheus alerts configured (where applicable)
- [ ] Runbook written (for production features)
- [ ] Security review passed (threat modeling for sensitive features)
- [ ] Documentation updated (API docs, user guide)
- [ ] Deployed to staging, smoke tests pass
- [ ] Product demo recorded (Loom video)

**Tech Debt DoD:**
- [ ] TODO resolved (code implemented or issue created)
- [ ] Tests still pass after change
- [ ] No regressions introduced
- [ ] Code review approved
- [ ] Merged to main branch

---

## Risk Register (Q4 2025 Detailed)

| Risk ID | Risk | Probability | Impact | Owner | Mitigation | Contingency |
|---------|------|-------------|--------|-------|------------|-------------|
| AA-R1 | Policy risk model mis-scores critical change | Low | High | AA1 Lead | Conservative weights, manual gates for score >60, canary testing on historical incidents | Emergency rollback, policy freeze kill switch |
| AB-R1 | Graph queries too slow (>1s P95) | Medium | High | AB1 Lead | Indexes, caching, depth limiting, pagination | Degrade to entity list view, defer graph feature |
| AC-R1 | Bulk ops overwhelm vendor APIs | Medium | Medium | AC1 Lead | Rate limits, queues, backoff, circuit breakers | Reduce batch size, throttle requests |
| AD-R1 | Insufficient feedback data (<100/week) | High | Medium | AD1 Lead | Seed with synthetic data, incentivize analysts (gamification) | Defer v4 rollout, continue v3 |
| AE-R1 | Alert fatigue from noisy alerts | Medium | Low | AE1 Lead | Tune thresholds, batch alerts, use severity levels | Adjust alert rules based on first week feedback |
| DEBT-R1 | Holiday PTO reduces throughput | High | Medium | PM | Lower commit points, strict WIP, clear triage | Extend sprint by 2 days if needed, defer stretch goals |

---

## Sprint Ceremonies (Q4 2025)

**Week 1: Nov 17-21**
- Mon Nov 17 09:00 MT: Sprint Planning (2h) - Review epics, assign stories
- Mon Nov 17 14:00 MT: Policy Safety Review (30m) - Security team walkthrough
- Daily 10:00 MT: Standup (15m)
- Fri Nov 21 14:00 MT: Mid-Sprint Demo (30m) - Show progress on epics

**Week 2: Nov 24-28 (Thanksgiving Week)**
- Mon Nov 24: Daily standup
- Tue Nov 25: Daily standup
- Wed Nov 26 14:00 MT: Next Sprint Grooming (30m)
- Thu Nov 27: **Thanksgiving Holiday** (US) - No meetings, async status
- Fri Nov 28: Reduced staffing, async status, release cut (if ready)

**Retro: Mon Dec 1 10:00 MT** (deferred from Fri Nov 28 due to holiday)

---

## Communication Plan

**Stakeholders:**
- **Engineering Team:** Daily standups, Slack #sprint-room
- **Analysts (end users):** #analyst-ops channel for feature enablement
- **Security Team:** Policy safety reviews, drift alert testing
- **Executives:** Friday update email (metrics snapshot, risks, blockers)

**Status Reports (Weekly):**
- Burnup chart (points completed vs. committed)
- Risk alerts (any risks elevated to High)
- Graph adoption metrics (% investigations using Graph UI)
- SOAR throughput (bulk ops processed)
- Intel v4 calibration (Brier score trend)
- TODO elimination progress (count closed)

**Demo Recordings:**
- Loom videos for each epic (5-10 min)
- Posted to #sprint-room and docs/demos/
- Used for enablement and product marketing

---

## Next Sprint Seeds (Dec 1-12, 2025)

Based on Q4 outcomes, plan for:
- **Policy Intelligence v1.1:** Learned weights from incident correlation, policy suggestion assistant
- **Graph UI v1.1:** Attack path scoring + remediation hints (not just visualization)
- **SOAR v1.5:** Graph-aware batching (batch by entity), per-tenant quotas, human-in-loop dashboard
- **Intel v4.1:** Weekly active learning cadence, annotator quality metrics, disagreement detection
- **Neo4j Enterprise Migration (Q1 2026 prep):** Procurement, architecture design, migration plan

---

**Document Version:** 1.0
**Last Updated:** Nov 20, 2025
**Owner:** Engineering Leadership
**Status:** Active - Q4 2025 Execution
