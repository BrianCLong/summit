# P4: MTWGL Billing & Resource Governance

You are implementing usage tracking, billing, and resource quotas for Summit.

**Goal:** Accurately meter tokens, compute time, storage, evals, and skill executions per tenant/workspace.

**Constraints:**
- Metering must be highly accurate (within 1% of raw data).
- Implement hard and soft quotas per plan tier (e.g., rejecting requests when limits are exceeded).
- Expose APIs for billing reports and cost dashboards drillable by agent, workspace, and project.

**Deliverables:**
- Usage accounting primitives (token counting, duration tracking).
- Quota enforcement middleware (rate limiting, burst handling).
- APIs for billing aggregation and reporting.
