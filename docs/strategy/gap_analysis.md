# Summit Gap Analysis: Automation Turn #5

## Critical Gaps

### 1. Runtime Semantics
- **Gap:** Lack of explicit `PAUSE`/`RESUME` states.
- **Impact:** Cannot handle preemption or long-running tasks gracefully.
- **Fix:** Update `EnhancedAutonomousOrchestrator` state machine.

### 2. Financial Operations (FinOps) for Agents
- **Gap:** No dedicated package for cost estimation across different model providers.
- **Impact:** Unpredictable spend; inability to "downgrade" models dynamically.
- **Fix:** Create `packages/finops/agent-cost-estimator`.

### 3. System-Level Health Metrics
- **Gap:** Metrics are task-centric (success/fail), not system-centric (convergence/oscillation).
- **Impact:** Hard to compare "agent quality" at a high level.
- **Fix:** Create `packages/eval/trajectory-metrics`.

### 4. Governance Runtime Integration
- **Gap:** `AGENTS.md` is text, not code.
- **Impact:** Governance relies on human reading, not machine enforcement.
- **Fix:** Schema-fize `AGENTS.md` charters and parse them at runtime.

### 5. HITL Experience
- **Gap:** Synchronous blocking.
- **Impact:** Slows down autonomy velocity.
- **Fix:** Implement confidence-based async escalation.
