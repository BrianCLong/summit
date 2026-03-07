# Budget Enforcement Mechanisms

**Owner:** Platform Engineering
**Status:** DRAFT

## 1. Overview

Budget enforcement ensures that the limits defined in [Agent Budgets](./agent-budgets.md) are strictly adhered to. The system favors **fail-closed** behavior to protect the platform.

Enforcement occurs at three distinct phases:

1.  **Invocation (Pre-Flight):** Static checks before execution starts.
2.  **Execution (Runtime):** Real-time monitoring and throttling.
3.  **Completion (Post-Run):** Audit and anomaly detection.

---

## 2. Invocation Time Enforcement (Static)

**Goal:** Prevent unauthorized or misconfigured agents from starting.

- **Manifest Validation:** The agent's `manifest.yaml` is validated against its [Budget Class](./agent-budgets.md#agent-budget-classes).
  - _Check:_ Does a Tier-2 agent request Tier-4 resources? -> **REJECT**.
- **Quota Check:** Check the Tenant's remaining aggregate budget for the billing period.
  - _Check:_ `TenantTotal + RequestEstimate > MonthlyLimit` -> **REJECT** (or Queue if policy allows).
- **Risk Evaluation:** Run the [Risk Scoring](./risk-scoring.md) model.
  - _Check:_ `RiskScore > ApprovedLevel` -> **BLOCK**.

**Mechanism:** A GitHub Action or Admission Controller hook that runs minimal logic (ms latency) before provisioning the agent container.

---

## 3. Runtime Enforcement (Dynamic)

**Goal:** Stop runaway processes and limit damage during execution.

### Token & Cost Governance

- **Proxy-Based Counting:** All LLM calls must pass through a `ModelGateway` (internal proxy).
  - The gateway maintains a running counter `tokens_consumed` for the `session_id`.
  - **Threshold:** If `tokens_consumed >= HARD_LIMIT`, the gateway returns `429 Too Many Requests` or `402 Payment Required` to the agent.
  - **Kill:** If the agent persists in retrying after 429s, the orchestrator terminates the pod.

### Wall-Clock Timeout

- **Orchestrator Timeout:** The container orchestrator (e.g., K8s, Docker Swarm) sets a `activeDeadlineSeconds` equal to the Budget Class runtime limit.
- **Signal:** `SIGTERM` sent at limit; `SIGKILL` 30 seconds later.

### Fan-Out Control

- **Recursion Depth:** The `AgentContext` object passed to sub-agents includes a `depth` counter.
  - `NewAgent(context: { depth: parent.depth + 1 })`.
  - If `depth > MAX_DEPTH`, instantiation fails.
- **Breadth Limit:** The orchestrator tracks active children per parent `run_id`.
  - If `active_children > MAX_FANOUT`, new spawn requests are queued or rejected.

---

## 4. Anomaly Detection & Auto-Termination

Beyond static limits, the system watches for heuristic anomalies indicating a "zombie" or "hostile" agent.

- **Loop Detection:** Repeating the same tool call with identical arguments > 5 times.
  - _Action:_ Inject "Stop Repeating" system prompt -> Then Terminate.
- **Error Storms:** > 50% error rate on API calls over a 1-minute window.
  - _Action:_ Pause execution & Alert Operator.
- **Resource Spike:** CPU/Memory usage > 200% of expected baseline.
  - _Action:_ Throttle (cgroups) -> Then Terminate.

---

## 5. Governance Hooks

### Approval Workflows

- **Tier-Up Requests:** If an agent needs to exceed its class budget (e.g., a massive migration), it must request a "Budget Override Token" via a ChatOps flow.
  - _Approver:_ Engineering Manager (Tier 3) or VP (Tier 4).
  - _Output:_ A signed JWT injected into the agent's env `BUDGET_OVERRIDE_TOKEN`.

### Kill Switch

- **Global Kill:** A feature flag `agents.kill_switch.global` immediately terminates all running agents (Tier 0-3). Tier-4 agents may have specific bypass logic for emergency recovery.
- **Tenant Kill:** `agents.kill_switch.tenant.{id}` terminates all agents for a specific tenant.

---

## Appendix: Implementation Pseudo-Code (Runtime Hook)

```typescript
// Middleware in the Model Gateway
async function enforceBudget(req: Request, res: Response, next: NextFunction) {
  const runId = req.headers["x-agent-run-id"];
  const runState = await redis.hgetall(`run:${runId}`);

  // 1. Check Hard Token Limit
  if (runState.tokensUsed > runState.tokenBudget) {
    telemetry.recordEvent("budget_exceeded", { runId });
    return res.status(402).json({ error: "Token budget exceeded" });
  }

  // 2. Check Global Kill Switch
  if (await featureFlags.isEnabled("global_kill_switch")) {
    return res.status(503).json({ error: "Platform halted" });
  }

  next();

  // Post-request: Update usage asynchronously
  updateUsage(runId, req.tokens, res.tokens);
}
```
