# AUTONOMY MODEL (GOVERNANCE FRAMEWORK)

> **Status**: LOCKED
> **Version**: 1.0.0
> **Authority**: Security Council + Release Captain
> **Created**: 2026-01-01
> **Last Modified**: 2026-01-01
> **Parent Document**: `docs/ga/GA_DEFINITION.md`

---

## Executive Summary

Summit is **agent-native** but **governance-first**. This document defines the **explicit autonomy boundaries** for all agents, autonomous systems, and AI-augmented capabilities operating within Summit.

**Core Principle**:
> Autonomy without veto is a defect.

**Operating Constraint**:
> All autonomous behaviors must declare a tier. Undeclared autonomy is **denied by default**.

---

## 1. AUTONOMY TIER TAXONOMY

Summit defines **five distinct autonomy tiers** with progressively increasing freedom and correspondingly stricter governance.

### Tier 0: Observe (Read-Only)

**Capability**: Read access to system state, metrics, logs, and audit trails.

**Human Approval**: None required.

**Audit Trail**: Optional (recommended for sensitive data access).

**Kill Switch**: N/A (no write actions possible).

**Veto Window**: N/A.

**Examples**:
- Metrics dashboards (Grafana)
- Log viewers (Loki, CloudWatch)
- Read-only GraphQL queries
- Audit trail exports (read-only)
- Compliance reporting (read-only)

**Restrictions**:
- No mutations allowed
- No side effects permitted
- No external API calls with credentials

**Policy Enforcement**:
```rego
# policies/autonomy_tier_0.rego
package autonomy.tier0

default allow = false

allow {
    input.action == "read"
    input.agent.tier == 0
}

deny {
    input.action != "read"
    input.agent.tier == 0
}
```

---

### Tier 1: Recommend (Suggest Actions)

**Capability**: Analyze system state and **recommend** actions to human operators.

**Human Approval**: **Required before execution** (agent does not execute).

**Audit Trail**: **Required** (log all recommendations with rationale).

**Kill Switch**: N/A (no autonomous execution).

**Veto Window**: N/A (humans decide if/when to act).

**Examples**:
- Policy optimization suggestions
- Security posture recommendations
- Cost optimization proposals
- Performance tuning hints
- Incident remediation playbooks (suggested, not executed)

**Restrictions**:
- Agent **cannot execute** recommendations
- Recommendations must include:
  - Rationale
  - Confidence score
  - Expected impact
  - Rollback plan (if applicable)

**Policy Enforcement**:
```rego
# policies/autonomy_tier_1.rego
package autonomy.tier1

default allow = false

allow {
    input.action == "recommend"
    input.agent.tier == 1
    input.recommendation.rationale != ""
    input.recommendation.confidence_score >= 0.7
}

deny {
    input.action == "execute"
    input.agent.tier == 1
}
```

**Audit Record Schema**:
```json
{
  "event_type": "recommendation",
  "agent_id": "policy-optimizer-v1",
  "timestamp": "2026-01-01T12:00:00Z",
  "recommendation": {
    "action": "adjust_rate_limit",
    "target": "tenant:acme-corp",
    "rationale": "Traffic pattern anomaly detected, 300% spike in API calls",
    "confidence_score": 0.85,
    "expected_impact": "Reduce P95 latency from 250ms to 150ms",
    "rollback_plan": "Revert rate_limit.rego line 42 to previous value"
  },
  "human_decision": null,
  "executed": false
}
```

---

### Tier 2: Execute (Perform Approved Actions)

**Capability**: Execute pre-approved actions with **human veto window**.

**Human Approval**: **Veto window** (default: 30 seconds) before execution.

**Audit Trail**: **Required** (log intent, execution, outcome).

**Kill Switch**: **Available** (operator can halt execution).

**Veto Window**: 30 seconds (configurable per agent/action).

**Examples**:
- Auto-remediation (restart failed service)
- Horizontal scaling (add/remove pods)
- Cache invalidation
- Temporary rate limit adjustment (within bounds)
- Incident response automation (pre-approved playbooks)

**Restrictions**:
- Actions must be **idempotent** (safe to retry)
- Actions must be **reversible** (rollback plan required)
- Actions must be within **pre-defined bounds** (no unbounded autonomy)
- Critical actions **escalate to Tier 1** (e.g., database mutations)

**Policy Enforcement**:
```rego
# policies/autonomy_tier_2.rego
package autonomy.tier2

default allow = false

allow {
    input.action == "execute"
    input.agent.tier == 2
    input.execution.veto_window_seconds >= 30
    input.execution.rollback_plan != ""
    is_within_bounds(input.execution.action, input.execution.parameters)
}

deny {
    input.action == "execute"
    input.agent.tier == 2
    is_critical_action(input.execution.action)
}

is_within_bounds(action, params) {
    # Example: scaling bounds
    action == "scale_deployment"
    params.min_replicas >= 2
    params.max_replicas <= 10
}

is_critical_action(action) {
    critical_actions := ["delete_database", "revoke_all_access", "disable_audit"]
    action == critical_actions[_]
}
```

**Veto Protocol**:
1. Agent declares intent (logs + UI notification)
2. 30-second countdown begins
3. Human can **veto** (cancel) or **approve** (execute immediately)
4. If no veto within 30s → execute
5. Log outcome (success/failure/vetoed)

**Audit Record Schema**:
```json
{
  "event_type": "autonomous_execution",
  "agent_id": "auto-scaler-v2",
  "timestamp_intent": "2026-01-01T12:00:00Z",
  "timestamp_veto_deadline": "2026-01-01T12:00:30Z",
  "timestamp_execution": "2026-01-01T12:00:31Z",
  "action": {
    "type": "scale_deployment",
    "target": "intelgraph-server",
    "parameters": {"replicas": 5},
    "rationale": "CPU >80% for 5 minutes",
    "rollback_plan": "kubectl scale deployment intelgraph-server --replicas=3"
  },
  "veto": {
    "vetoed": false,
    "veto_by": null,
    "veto_reason": null
  },
  "outcome": {
    "status": "success",
    "message": "Scaled to 5 replicas, P95 latency reduced to 120ms"
  }
}
```

---

### Tier 3: Optimize (Self-Tune Within Bounds)

**Capability**: Continuously optimize parameters **within pre-defined bounds**, post-hoc human review.

**Human Approval**: **Post-hoc review** (weekly/monthly audit).

**Audit Trail**: **Required** (all tuning actions logged).

**Kill Switch**: **Available** (disable agent, revert to baseline).

**Veto Window**: None (executes immediately, reviewed later).

**Examples**:
- Rate limit auto-tuning (within min/max bounds)
- Cache size optimization (within memory limits)
- Query optimizer (index selection, execution plan tuning)
- Cost optimizer (switch between equivalent cloud services)
- Anomaly detection threshold tuning

**Restrictions**:
- **Bounds are immutable** (defined in policy, cannot be changed by agent)
- **No critical paths** (agent cannot optimize authentication, authorization, audit)
- **Revertible** (baseline configuration always available)
- **Observable** (metrics exported for human review)

**Policy Enforcement**:
```rego
# policies/autonomy_tier_3.rego
package autonomy.tier3

default allow = false

allow {
    input.action == "optimize"
    input.agent.tier == 3
    is_within_bounds(input.optimization.parameter, input.optimization.value)
    not is_critical_parameter(input.optimization.parameter)
}

deny {
    input.action == "optimize"
    input.agent.tier == 3
    is_critical_parameter(input.optimization.parameter)
}

is_within_bounds(parameter, value) {
    bounds := data.optimization_bounds[parameter]
    value >= bounds.min
    value <= bounds.max
}

is_critical_parameter(parameter) {
    critical_params := ["auth_timeout", "audit_retention_days", "encryption_key_rotation"]
    parameter == critical_params[_]
}
```

**Bounds Configuration** (immutable, policy-as-code):
```json
{
  "optimization_bounds": {
    "rate_limit_requests_per_minute": {"min": 100, "max": 10000},
    "cache_size_mb": {"min": 128, "max": 2048},
    "connection_pool_size": {"min": 10, "max": 100},
    "query_timeout_seconds": {"min": 5, "max": 60}
  }
}
```

**Audit Record Schema**:
```json
{
  "event_type": "autonomous_optimization",
  "agent_id": "rate-limit-tuner-v1",
  "timestamp": "2026-01-01T12:00:00Z",
  "optimization": {
    "parameter": "rate_limit_requests_per_minute",
    "previous_value": 500,
    "new_value": 750,
    "rationale": "P95 latency stable at 100ms, headroom available",
    "bounds": {"min": 100, "max": 10000}
  },
  "outcome": {
    "status": "success",
    "metrics_delta": {"p95_latency_ms": -5, "error_rate": 0.0}
  }
}
```

**Review Protocol**:
- Weekly report generated: `scripts/generate-autonomy-report.ts`
- SRE reviews optimization history
- Anomalies flagged for investigation
- Bounds adjusted if needed (via governance process)

---

### Tier 4: Self-Modify (Change Own Logic/Config)

**Capability**: Modify own source code, configuration, or decision logic.

**Human Approval**: **Pre-approved scenarios only** (e.g., A/B test frameworks).

**Audit Trail**: **Required** (all modifications logged, diff preserved).

**Kill Switch**: **Available** (revert to last known good version).

**Veto Window**: 5 minutes (for high-risk modifications).

**Examples**:
- A/B test framework (swap decision logic between variants)
- Feature flag management (enable/disable features based on metrics)
- Model retraining (update ML model weights based on new data)

**Restrictions**:
- **Disabled by default** (opt-in only)
- **Sandboxed** (cannot modify critical paths: auth, audit, policy engine)
- **Versioned** (all modifications tracked in version control or config store)
- **Testable** (modifications must pass automated tests before deployment)
- **Revertible** (rollback to previous version within 1 minute)

**Policy Enforcement**:
```rego
# policies/autonomy_tier_4.rego
package autonomy.tier4

default allow = false

allow {
    input.action == "self_modify"
    input.agent.tier == 4
    input.agent.self_modify_enabled == true  # Opt-in
    is_approved_scenario(input.modification.scenario)
    not is_critical_component(input.modification.target)
    has_rollback_plan(input.modification)
}

deny {
    input.action == "self_modify"
    input.agent.tier == 4
    is_critical_component(input.modification.target)
}

is_approved_scenario(scenario) {
    approved_scenarios := ["ab_test", "feature_flag", "model_retrain"]
    scenario == approved_scenarios[_]
}

is_critical_component(target) {
    critical_components := ["auth", "audit", "policy_engine", "provenance"]
    startswith(target, critical_components[_])
}

has_rollback_plan(modification) {
    modification.rollback_version != ""
    modification.rollback_command != ""
}
```

**Self-Modification Protocol**:
1. Agent proposes modification (logs intent + diff)
2. Automated tests run on modified version
3. If tests pass → 5-minute veto window
4. If no veto → deploy modified version
5. Monitor metrics for 10 minutes
6. If metrics degrade → auto-rollback
7. Log outcome + diff to audit trail

**Audit Record Schema**:
```json
{
  "event_type": "self_modification",
  "agent_id": "ab-test-controller-v1",
  "timestamp_intent": "2026-01-01T12:00:00Z",
  "timestamp_execution": "2026-01-01T12:05:01Z",
  "modification": {
    "scenario": "ab_test",
    "target": "recommendation_engine_config",
    "diff": "--- a/config.json\n+++ b/config.json\n@@ -1,1 +1,1 @@\n-\"algorithm\": \"collaborative_filtering\"\n+\"algorithm\": \"neural_collaborative_filtering\"",
    "rollback_version": "v2.3.1",
    "rollback_command": "kubectl rollout undo deployment/recommendation-engine"
  },
  "tests": {
    "status": "passed",
    "suite": "recommendation_engine_tests",
    "duration_seconds": 45
  },
  "veto": {
    "vetoed": false,
    "veto_by": null
  },
  "outcome": {
    "status": "success",
    "metrics_delta": {"click_through_rate": +0.05, "p95_latency_ms": +10}
  }
}
```

**Governance Requirements for Tier 4**:
1. **Security Council Approval**: Required to enable Tier 4 for any agent
2. **Sandbox Enforcement**: Agent cannot modify critical components (enforced by policy)
3. **Automated Testing**: All modifications must pass CI before deployment
4. **Metrics Monitoring**: Continuous monitoring with auto-rollback on degradation
5. **Audit Trail**: All modifications logged with diffs, preserved for 7 years

---

## 2. AGENT CONTRACT ENFORCEMENT

### 2.1 Contract Schema

Every agent must declare its autonomy tier and capabilities via `agent-contract.json`:

```json
{
  "$schema": "https://summit.example.com/schemas/agent-contract-v1.json",
  "agent_id": "cost-optimizer-v1",
  "version": "1.2.3",
  "autonomy_tier": 3,
  "capabilities": [
    "optimize_cache_size",
    "tune_rate_limits",
    "select_cloud_provider"
  ],
  "required_permissions": [
    "read:metrics",
    "write:config",
    "read:cost_data"
  ],
  "failure_modes": [
    "timeout",
    "invalid_optimization_bounds",
    "policy_violation",
    "metrics_unavailable"
  ],
  "evidence_hooks": [
    "log_optimization_intent",
    "record_optimization_outcome",
    "export_audit_trail"
  ],
  "veto_window_seconds": 0,
  "kill_switch_enabled": true,
  "bounds": {
    "cache_size_mb": {"min": 128, "max": 2048},
    "rate_limit_rpm": {"min": 100, "max": 10000}
  }
}
```

### 2.2 Contract Validation

**CI Enforcement**:
```bash
# .github/workflows/ci.yml
- name: Validate Agent Contracts
  run: npx tsx scripts/validate-agent-contracts.ts
```

**Validation Rules**:
- Schema compliance (JSON Schema validation)
- Tier declaration (0-4, valid integer)
- Capabilities match declared tier (e.g., Tier 0 cannot declare "execute")
- Permissions are minimal (least privilege)
- Failure modes are documented
- Evidence hooks are implemented
- Bounds are defined (for Tier 3+)

**Failure Action**: CI fails, PR blocked.

### 2.3 Runtime Enforcement

**Policy Engine Integration**:
```rego
# policies/agent_contract_enforcement.rego
package agent.contract

default allow = false

allow {
    agent := data.agent_contracts[input.agent_id]
    agent.autonomy_tier >= required_tier_for_action(input.action)
    input.capability == agent.capabilities[_]
    input.permission == agent.required_permissions[_]
}

required_tier_for_action(action) = 0 { action == "read" }
required_tier_for_action(action) = 1 { action == "recommend" }
required_tier_for_action(action) = 2 { action == "execute" }
required_tier_for_action(action) = 3 { action == "optimize" }
required_tier_for_action(action) = 4 { action == "self_modify" }
```

**Violation Response**:
- Request **rejected** (HTTP 403)
- Incident logged (severity: P2)
- Agent flagged for review
- Notify security council

---

## 3. KILL SWITCH & VETO MECHANISMS

### 3.1 Kill Switch (Global)

**Purpose**: Emergency halt of all autonomous agents.

**Trigger**:
- Security incident (P0)
- Data corruption detected
- Policy engine failure
- Manual operator intervention

**Mechanism**:
```bash
# Emergency kill switch
kubectl scale deployment --all --replicas=0 -n autonomous-agents
kubectl delete configmap agent-contracts -n autonomous-agents
```

**Activation**:
```bash
# Operator command
./scripts/emergency-kill-switch.sh --reason "P0 incident #12345"
```

**Audit Trail**:
```json
{
  "event_type": "kill_switch_activated",
  "timestamp": "2026-01-01T12:00:00Z",
  "activated_by": "alice@summit.example.com",
  "reason": "P0 incident #12345: unauthorized data access detected",
  "agents_halted": ["cost-optimizer-v1", "auto-scaler-v2", "ab-test-controller-v1"],
  "restoration_plan": "Manual review + security audit before re-enabling"
}
```

### 3.2 Veto Mechanism (Per-Agent)

**Purpose**: Human operator cancels autonomous action before execution.

**UI Integration**:
- Real-time notification (Slack, PagerDuty, web UI)
- One-click veto button
- Countdown timer (30s default)

**Veto Record**:
```json
{
  "event_type": "veto",
  "timestamp": "2026-01-01T12:00:15Z",
  "vetoed_by": "bob@summit.example.com",
  "agent_id": "auto-scaler-v2",
  "action": "scale_deployment",
  "veto_reason": "Manual scaling already in progress",
  "veto_time_remaining_seconds": 15
}
```

**Post-Veto Actions**:
- Log veto reason
- Update agent metrics (veto rate)
- Review agent behavior (if veto rate >10%, escalate for tuning)

---

## 4. OBSERVABILITY & AUDIT

### 4.1 Autonomy Metrics

**Prometheus Metrics**:
```
# Recommendations generated (Tier 1)
agent_recommendations_total{agent_id, action_type, confidence_score}

# Executions performed (Tier 2)
agent_executions_total{agent_id, action_type, outcome}

# Optimizations applied (Tier 3)
agent_optimizations_total{agent_id, parameter, delta}

# Self-modifications deployed (Tier 4)
agent_self_modifications_total{agent_id, scenario, rollback_triggered}

# Vetoes
agent_vetoes_total{agent_id, vetoed_by, reason}

# Kill switch activations
agent_kill_switch_activations_total{reason}
```

### 4.2 Audit Trail Requirements

**Retention**: 7 years (same as compliance data).

**Schema**: See Section 1 (Audit Record Schema per tier).

**Export**:
```bash
./scripts/generate-autonomy-audit-report.ts \
  --start 2026-01-01T00:00:00Z \
  --end 2026-01-07T23:59:59Z \
  --format json \
  --output autonomy-audit-2026-W01.json
```

**Compliance Requirement**:
> Every autonomous action must have a corresponding audit record.
> Missing audit records are **compliance violations** (P1 incident).

---

## 5. DEPLOYMENT & ROLLOUT

### 5.1 Default Autonomy Tier (GA)

**Production Default**: **Tier 1** (Recommend only).

**Rationale**:
- Conservative stance minimizes risk
- Humans retain full control
- Audit trail builds confidence
- Gradual escalation to Tier 2+ based on evidence

**Escalation Process**:
1. Agent operates at Tier 1 for 30 days
2. Review recommendation accuracy, veto rate, human feedback
3. If metrics are green (accuracy >90%, veto rate <5%) → propose Tier 2
4. Security council approves → update agent contract
5. Deploy Tier 2 with 30-day monitoring window
6. Repeat for Tier 3+ escalation

### 5.2 Opt-In for Higher Tiers

**Tier 2+ Activation**:
- Requires **Security Council approval**
- Requires **documented risk assessment**
- Requires **rollback plan**
- Requires **monitoring dashboard** (Grafana)

**Approval Template**:
```markdown
# Tier Escalation Request: auto-scaler-v2 (Tier 1 → Tier 2)

**Agent**: auto-scaler-v2
**Current Tier**: 1 (Recommend)
**Requested Tier**: 2 (Execute)
**Rationale**: 30-day trial shows 95% recommendation accuracy, 2% veto rate, zero incidents.
**Risk Assessment**: Low (scaling is idempotent, reversible, bounded)
**Rollback Plan**: Revert to Tier 1 via agent-contract.json update, redeploy in <5 min
**Monitoring**: Grafana dashboard (auto-scaler-metrics)
**Approval**: Security Lead + SRE Lead + Release Captain

**Approved**: ✅ (2026-02-01)
```

---

## 6. SECURITY & THREAT MODEL

### 6.1 Threat Scenarios

| Threat | Tier | Mitigation |
|--------|------|------------|
| **Agent exceeds declared tier** | All | Policy engine denies, logs violation |
| **Agent modifies critical component** | 4 | Sandbox enforcement, policy denial |
| **Agent executes unbounded action** | 2, 3 | Bounds enforcement, policy denial |
| **Agent bypasses veto window** | 2 | Veto protocol enforced by orchestrator |
| **Agent tampers with audit trail** | All | Immutable audit log (append-only DB) |
| **Compromised agent credentials** | All | Short-lived tokens, rotation, revocation |
| **Agent collusion** | All | Agent-to-agent communication logged, restricted |

### 6.2 Defense-in-Depth

**Layered Controls**:
1. **Agent Contract Validation** (CI + runtime)
2. **Policy Engine Enforcement** (OPA, default deny)
3. **Veto Mechanisms** (Tier 2+)
4. **Kill Switch** (global halt)
5. **Audit Trail** (immutable, 7-year retention)
6. **Monitoring & Alerting** (anomaly detection)
7. **Security Council Review** (quarterly audit)

---

## 7. GOVERNANCE & AMENDMENT

### 7.1 Amendment Authority

This document is **locked** and can only be amended via formal governance process.

**Amendment Triggers**:
- Security incident requiring tier redefinition
- New autonomy capability (e.g., Tier 5)
- Regulatory requirement (e.g., AI Act compliance)

**Amendment Process**:
1. Proposal (ADR format)
2. Security Council review
3. Approval (Security Lead + SRE Lead + Release Captain)
4. Version bump + changelog
5. Archive prior version to `docs/autonomy/archive/`

### 7.2 Version History

| Version | Date | Changes | Approved By |
|---------|------|---------|-------------|
| 1.0.0 | 2026-01-01 | Initial autonomy model | Release Captain |

---

## 8. EXAMPLES & REFERENCE IMPLEMENTATIONS

### 8.1 Example Agent Contracts

**Tier 1 Agent** (Policy Recommender):
```json
{
  "agent_id": "policy-recommender-v1",
  "autonomy_tier": 1,
  "capabilities": ["recommend_policy_change", "analyze_audit_trail"],
  "required_permissions": ["read:policies", "read:audit_logs"],
  "failure_modes": ["timeout", "invalid_policy_syntax"],
  "evidence_hooks": ["log_recommendation"],
  "veto_window_seconds": 0,
  "kill_switch_enabled": false
}
```

**Tier 2 Agent** (Auto-Scaler):
```json
{
  "agent_id": "auto-scaler-v2",
  "autonomy_tier": 2,
  "capabilities": ["scale_deployment", "adjust_replicas"],
  "required_permissions": ["read:metrics", "write:deployments"],
  "failure_modes": ["timeout", "k8s_api_error", "policy_violation"],
  "evidence_hooks": ["log_intent", "log_outcome"],
  "veto_window_seconds": 30,
  "kill_switch_enabled": true,
  "bounds": {"min_replicas": 2, "max_replicas": 10}
}
```

**Tier 3 Agent** (Rate Limit Tuner):
```json
{
  "agent_id": "rate-limit-tuner-v1",
  "autonomy_tier": 3,
  "capabilities": ["optimize_rate_limits"],
  "required_permissions": ["read:metrics", "write:config"],
  "failure_modes": ["timeout", "metrics_unavailable", "bounds_violation"],
  "evidence_hooks": ["log_optimization"],
  "veto_window_seconds": 0,
  "kill_switch_enabled": true,
  "bounds": {"rate_limit_rpm": {"min": 100, "max": 10000}}
}
```

### 8.2 Reference Scripts

**Validate Agent Contracts**:
```typescript
// scripts/validate-agent-contracts.ts
import { glob } from 'glob';
import { readFileSync } from 'fs';
import Ajv from 'ajv';

const schema = JSON.parse(readFileSync('schemas/agent-contract-v1.json', 'utf-8'));
const ajv = new Ajv();
const validate = ajv.compile(schema);

const contracts = glob.sync('**/agent-contract.json');
let valid = true;

for (const contractPath of contracts) {
  const contract = JSON.parse(readFileSync(contractPath, 'utf-8'));
  if (!validate(contract)) {
    console.error(`Invalid contract: ${contractPath}`, validate.errors);
    valid = false;
  }
}

process.exit(valid ? 0 : 1);
```

**Generate Autonomy Audit Report**:
```typescript
// scripts/generate-autonomy-audit-report.ts
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function generateReport(start: string, end: string) {
  const result = await pool.query(`
    SELECT agent_id, event_type, COUNT(*) as count
    FROM audit_trail
    WHERE timestamp >= $1 AND timestamp <= $2
      AND event_type IN ('recommendation', 'autonomous_execution', 'autonomous_optimization', 'self_modification', 'veto')
    GROUP BY agent_id, event_type
    ORDER BY count DESC
  `, [start, end]);

  console.log(JSON.stringify(result.rows, null, 2));
}

generateReport(process.argv[2], process.argv[3]);
```

---

## CONCLUSION

**Autonomy is a feature, not a bug—but only when governed.**

This model ensures Summit can operate autonomously **without becoming reckless**.

**Next Steps**:
1. Implement agent contract validation in CI (`scripts/validate-agent-contracts.ts`)
2. Deploy policy enforcement (`policies/autonomy_tier_*.rego`)
3. Integrate veto UI (Slack bot + web dashboard)
4. Create kill switch runbook (`docs/ga/RUNBOOKS.md` Section 7)
5. Train operators on autonomy tiers (SRE onboarding)

**Questions?** → Open issue with label `autonomy-model-question`

**Enforcement**: This document is **locked** and enforced via CI + policy engine.

---

**End of Autonomy Model**
