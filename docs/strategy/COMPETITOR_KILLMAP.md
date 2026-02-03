<!-- markdownlint-disable MD024 -->
# Competitor Kill-Map

This is a positioning and deal-execution tool: identify where competitors win, where they break, and how Summit reframes the evaluation.

## 2.1 Competitive Categories and Their Failure Modes

### Category A: Workflow Orchestrators (DAG / low-code automation)

#### Strengths

* fast time-to-demo
* broad integrations
* good for deterministic workflows

#### Failure modes

* weak governance semantics
* poor replay/audit at action-level
* no cost-aware planning
* agents are “steps,” not processes

#### Summit kill points

* “We run agents as processes with budgets, not flows with prompts.”
* “We preflight policy on every tool call.”
* “We replay runs for audits and incident response.”

#### Proof artifacts

* demo: pause/resume/kill + replay
* dashboard: cost-per-success, escalation rate

### Category B: Agent Frameworks / SDKs (developer-centric libraries)

#### Strengths

* flexible
* fast to prototype
* strong dev mindshare

#### Failure modes

* governance is DIY
* observability is partial
* enterprise buyers do not accept “assemble your own platform”
* reliability and cost controls are ad hoc

#### Summit kill points

* “Frameworks build demos; we run production.”
* “You can’t bolt on auditability after go-live.”
* “We ship guarantees with evidence.”

#### Proof artifacts

* policy engine in runtime
* immutable logs + provenance bundle

### Category C: LLM Platforms with Tools (model providers / tool calling)

#### Strengths

* best models, best capabilities
* integrated tool APIs

#### Failure modes

* not neutral across models
* governance scoped to their ecosystem
* weak enterprise control plane beyond model usage

#### Summit kill points

* “We are model-agnostic and enforce governance consistently across providers.”
* “We control end-to-end trajectory, budgets, and evidence.”

#### Proof artifacts

* dynamic model routing
* spend predictability under budget constraints

### Category D: Observability / Monitoring Vendors retrofitting AI

#### Strengths

* metrics, tracing, dashboards
* enterprise adoption

#### Failure modes

* monitoring without control is insufficient
* no runtime semantics (can’t enforce budgets/policies)
* does not prevent incidents, only reports them

#### Summit kill points

* “Observability without enforcement is an autopsy, not prevention.”
* “We enforce at runtime and prove it in logs.”

#### Proof artifacts

* prevented policy violation counts
* preflight policy decisions in trace view

### Category E: Governance / GRC overlays

#### Strengths

* compliance language, audit workflows
* risk frameworks mapping

#### Failure modes

* detached from actual execution
* relies on human process rather than machine enforcement
* slow and brittle

#### Summit kill points

* “Governance must compile into runtime execution.”
* “If policy is not enforced pre-execution, it’s advisory, not control.”

#### Proof artifacts

* charter enforcement
* signed attestations / evidence packs

## 2.2 Evaluation Traps to Set (How Summit Wins RFPs)

When an evaluator asks “does it orchestrate agents?”, force the conversation into these tests:

1. **Pause/Resume/Replay Test**
   “Show me a deterministic replay of a failed run and the evidence trail.”

2. **Budget Exhaustion Test**
   “Show me graceful degradation under token and monetary caps without unsafe actions.”

3. **Policy Gate Test**
   “Show me a prohibited tool call being blocked pre-execution with an auditable decision record.”

4. **Variance Test**
   “Run the same task 20 times. Show stability, escalation rate, and cost variance.”

5. **Incident Workflow Test**
   “Show the AIR workflow: taxonomy, root cause artifacts, and regression gates.”

## 2.3 Standard Competitor Claims and Summit Counters

* “We have governance.” → “Is it enforced at runtime pre-execution, or reviewed after?”
* “We have evals.” → “Do you measure trajectory stability and cost-per-success?”
* “We have monitoring.” → “Can you prevent incidents via policy and budgets?”
* “We’re enterprise-ready.” → “Show replayability, immutable logs, and provenance.”
