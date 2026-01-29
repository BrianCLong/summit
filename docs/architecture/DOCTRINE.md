# Summit Architecture Doctrine

## 1.1 Purpose

Summit is an **Agent Runtime and Governance OS** for deploying autonomous systems that must be **safe, cost-bounded, auditable, and reliable** in production. Summit is not a workflow builder; it is a runtime with enforceable semantics.

## 1.2 North Star Outcomes

Summit exists to deliver four production-grade guarantees:

1. **Predictability**: bounded cost, bounded latency variance, bounded blast radius
2. **Auditability**: immutable logs, deterministic replay, end-to-end provenance
3. **Reliability**: measurable system-level stability, controlled recovery and rollback
4. **Governability**: runtime policy enforcement, explicit authority, human oversight without paralysis

## 1.3 First Principles (Non-Negotiable)

1. **Agents are processes**: long-lived state, lifecycle control, resource accounting.
2. **Tools are privileged operations**: every tool call is policy-checked before execution.
3. **Autonomy requires budgets**: tokens, time, tools, data, and money are explicit constraints.
4. **Observability is a product feature**: system metrics, traces, and incident workflows are first-class.
5. **Governance is runtime law**: not prompt text, not middleware, not post-hoc review.
6. **Determinism is a capability**: replayability is required for trust, debugging, and audits.

## 1.4 Core Runtime Abstractions

Summit standardizes on the following primitives.

### A. Agent Charter (Authority Contract)

A charter defines:

* scope (what the agent may do)
* allowed tools + tool constraints
* data access boundaries
* stop conditions
* budget envelope
* escalation rules
* evidence requirements (what must be logged and why)

A charter is machine-enforceable and versioned.

### B. Lifecycle and Scheduling

Agents support:

* spawn, suspend, resume, terminate
* preemption (budget/time cutoff)
* priority and queueing
* concurrency limits
* isolation boundaries (memory, tools, data domains)

### C. Budget Model (Unified Resource Accounting)

Budgets are explicit and enforced:

* token budget
* wall-clock time budget
* tool-call budget (by tool class)
* monetary budget (FinOps)
* risk budget (policy-defined)

Budgets are inputs to planning, not merely tracked outputs.

### D. Tool Execution Model (Privileged Ops)

Every tool call goes through:

1. preflight policy check
2. execution with scoped credentials
3. postcondition verification
4. evidence capture (inputs/outputs, hashes, timestamps, policy decision)

Tool calls are auditable and replayable.

### E. Memory Model (Separation and Sealing)

* short-term working memory is scoped to a run
* long-term memory is explicitly written via governed APIs
* cross-agent memory sharing is explicit, permissioned, and logged
* “sealed memory” states enable replay and forensics

### F. Evidence and Replay (Deterministic Accountability)

Summit produces:

* immutable execution log (append-only)
* run manifest (models, prompts, tools, versions, budgets)
* artifact hashes
* deterministic run IDs and trace IDs
* replay mode (same inputs, same policies, reproduce behavior within defined tolerances)

## 1.5 Planning and Execution Doctrine

Summit decomposes autonomy into two modes:

* **Explore mode**: cheap models, broad search, speculation allowed within strict budget
* **Commit mode**: expensive models, verified actions, tighter policy gates, stronger evidence

Planning must:

* estimate cost before branching
* choose models dynamically based on confidence and budget
* escalate when uncertainty meets policy-defined thresholds
* prefer rollbackable actions

## 1.6 System-Level Evaluation Doctrine

Summit’s evaluation unit is the **system trajectory**, not the prompt.

Required metrics:

* outcome success rate over time (not single runs)
* trajectory stability / variance
* convergence time and retries
* rollback frequency
* human escalation rate and reasons
* cost per successful outcome
* policy violation attempts prevented vs allowed
* “unknown unknowns” captured via incident taxonomy

Operational discipline:

* **Agent Incident Reviews (AIRs)**: postmortems with action items, like SRE
* regression gates on system-level metrics, not only unit tests

## 1.7 Human Oversight Doctrine

Summit avoids “approval everywhere.” Oversight is designed as:

* budget-bounded autonomy
* confidence-weighted escalation
* exception-driven synchronous approvals
* after-action review for low-risk operations
* clear operator controls (pause/resume/kill/replay)

## 1.8 Product Boundaries (What Summit Refuses To Be)

Summit will not be:

* a prompt marketplace
* a template-only workflow builder
* a chat UI pretending to be production automation
* governance bolted on after the fact

Summit is:

* a runtime
* a policy engine
* an evidence system
* an operational platform
