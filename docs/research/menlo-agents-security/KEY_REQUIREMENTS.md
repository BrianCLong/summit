# Key Requirements Derived from Menlo Sources

1. **Principal chain must be attached to every agent action**, capturing initiating human (if any), agent identity, runtime/session ID, and correlation/trace IDs.
2. **Tool executions must pass through a single gateway chokepoint** before any side effect occurs, with no bypass paths for registered tools.
3. **Allowlist/denylist enforcement is mandatory** for tools and sensitive targets; defaults must deny unknown tools.
4. **Attribution strictness must be configurable**, with strict mode denying execution when principal data is incomplete.
5. **Kill-switch/break-glass control must exist** to disable agent actions globally with auditable rationale.
6. **Rate limiting or call budgeting must cap tool invocations per window** to mitigate runaway chains.
7. **Output/data egress must be bounded** (size and redaction of secrets/injection cues) before being persisted or returned.
8. **Audit/provenance events must be emitted for attempts, decisions, and results**, in a structured, queryable format.
9. **Policy decisions must be explainable** with machine-readable reasons and policy versioning for replay.
10. **Resource targeting must be captured** (tool name, action type, target URL/domain/path) for downstream governance.
11. **Failure classification must be recorded** (policy denial vs execution error vs kill-switch) to support incident response.
12. **Configuration knobs must be operator-visible** (allow/deny lists, rate limits, attribution mode, kill switch state).
13. **Observability counters/latency must be captured** for each action to detect anomalous tool behavior.
14. **Redaction rules must cover sensitive fields in inputs and outputs** and evidence should record applied redactions.
15. **Default posture should be safe** (deny unknown tools, low output bounds, conservative rate limits) with explicit opt-out.
16. **Governance documentation must map controls to code and tests** to satisfy compliance traceability.
