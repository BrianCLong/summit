# Patent Claims

## SYSTEM AND METHOD FOR EVALUATION-AWARE ROUTING IN TOOL-AUGMENTED LANGUAGE MODEL SYSTEMS

### INDEPENDENT CLAIMS

**Claim 1. (Method - Routing)**

A computer-implemented method for routing tool invocations in a language model system, the method comprising:

a) receiving, by a processor, a task request that requires invocation of one or more tools from a plurality of available tools;

b) generating, by the processor, a set of candidate tool selections, each candidate having an associated estimated quality score and estimated cost;

c) computing, by the processor, a composite score for each candidate tool selection using a scoring function that combines the estimated quality score and estimated cost according to a configurable weighting parameter;

d) selecting, by the processor, a tool based on the computed composite scores;

e) recording, by the processor, the routing decision in a structured trace format including the selected tool, composite score, and reasoning factors; and

f) executing the selected tool and recording execution metrics in the structured trace.

**Claim 2. (Method - Adaptive Learning)**

A computer-implemented method for learning routing policies from evaluation outcomes in a tool-augmented language model system, the method comprising:

a) executing, by a processor, a plurality of evaluation scenarios through a language model system with tool access, wherein each scenario comprises defined steps and success criteria;

b) recording, by the processor, structured traces capturing routing decisions, tool invocations, and outcomes for each scenario execution;

c) aggregating, by the processor, evaluation metrics from the recorded traces, including success rates, costs, and latencies;

d) updating, by the processor, routing weights for each tool based on the aggregated evaluation metrics, wherein tools with higher success rates and cost efficiency receive increased weights; and

e) applying the updated routing weights in subsequent routing decisions.

**Claim 3. (System)**

A system for evaluation-aware routing in tool-augmented language model applications, the system comprising:

a) a memory storing computer-executable instructions;

b) a processor configured to execute the instructions to implement:

   i) an evaluation engine configured to load and execute multi-step evaluation scenarios defined in a structured format, the scenarios specifying available tools, execution steps, and success criteria;

   ii) a trace collection module configured to capture structured traces of routing decisions, tool invocations, and execution outcomes, the traces conforming to a canonical schema;

   iii) a routing engine configured to select tools from candidate sets based on a configurable balance of estimated quality and cost, the routing engine comprising at least one of a cost-aware greedy router and an adaptive router that learns from evaluation outcomes;

   iv) a cost model configured to estimate execution costs based on token usage, tool-specific costs, and latency factors; and

   v) a telemetry module configured to persist traces and export metrics for analysis.

### DEPENDENT CLAIMS

**Claim 4.** The method of claim 1, wherein the scoring function is defined as:
```
score = estimatedQuality × (1 - λ) - normalizedCost × λ
```
where λ is the configurable weighting parameter ranging from 0 to 1, with higher values prioritizing cost efficiency.

**Claim 5.** The method of claim 1, further comprising:
filtering the set of candidate tool selections based on a latency budget constraint prior to computing composite scores.

**Claim 6.** The method of claim 1, further comprising:
performing a safety check on the task request prior to tool selection, wherein the safety check detects at least one of: jailbreak attempts, personally identifiable information, harmful content, and injection attacks.

**Claim 7.** The method of claim 1, wherein the structured trace format comprises:
- a unique trace identifier;
- event records with event type, timestamp, and parent-child relationships;
- metrics including duration, token counts, and cost; and
- summary aggregations across all events.

**Claim 8.** The method of claim 2, wherein updating routing weights comprises:
applying an exponential moving average with a configurable learning rate to blend historical weights with new outcome scores.

**Claim 9.** The method of claim 2, further comprising:
maintaining category-specific routing weights, wherein tools are weighted differently based on the category of the evaluation scenario.

**Claim 10.** The method of claim 2, further comprising:
dynamically adjusting the cost weighting parameter based on aggregate success rates, wherein the weighting parameter is decreased when success rates fall below a threshold to prioritize quality.

**Claim 11.** The system of claim 3, wherein the evaluation scenarios are defined in YAML format comprising:
- a unique scenario identifier;
- a category classification;
- tool definitions with cost and latency estimates;
- step definitions with inputs and expected outputs;
- success criteria specifications; and
- constraint definitions for maximum tokens, cost, and latency.

**Claim 12.** The system of claim 3, wherein the routing engine further comprises:
a random router that serves as a baseline for comparison in ablation studies.

**Claim 13.** The system of claim 3, wherein the adaptive router maintains:
- per-tool quality history;
- per-tool cost history;
- per-category tool weights; and
- an exportable model representation for persistence.

**Claim 14.** The system of claim 3, wherein the cost model is configurable to specify:
- per-token costs differentiated by input and output tokens;
- per-tool base costs;
- latency penalty factors; and
- aggregation methods for multi-step executions.

**Claim 15.** The system of claim 3, further comprising:
a safety module configured to detect and block potentially harmful inputs using pattern matching against known attack vectors.

**Claim 16.** The system of claim 3, further comprising:
a red-team testing module comprising predefined adversarial scenarios for validating safety measures.

**Claim 17.** The method of claim 1, wherein the plurality of available tools comprises at least one of:
code interpreters, file search tools, web browsing tools, database query tools, and API calling tools.

**Claim 18.** The method of claim 2, wherein the evaluation scenarios comprise at least one of:
code correction scenarios, code explanation scenarios, data analysis scenarios, multi-tool pipeline scenarios, agentic flow scenarios, and reasoning scenarios.

**Claim 19.** The system of claim 3, wherein the telemetry module is configured to export traces in at least one of:
JSONL format for file persistence, Prometheus format for metrics collection, and OpenTelemetry format for distributed tracing.

**Claim 20.** A non-transitory computer-readable medium storing instructions that, when executed by a processor, cause the processor to perform the method of claim 1.

---

## CLAIM DEPENDENCY CHART

```
Independent Claims:
├── Claim 1 (Method - Routing)
│   ├── Claim 4 (Scoring function)
│   ├── Claim 5 (Latency filtering)
│   ├── Claim 6 (Safety checks)
│   ├── Claim 7 (Trace format)
│   ├── Claim 17 (Tool types)
│   └── Claim 20 (CRM)
├── Claim 2 (Method - Adaptive)
│   ├── Claim 8 (EMA update)
│   ├── Claim 9 (Category weights)
│   ├── Claim 10 (Dynamic cost weight)
│   └── Claim 18 (Scenario types)
└── Claim 3 (System)
    ├── Claim 11 (YAML format)
    ├── Claim 12 (Random router)
    ├── Claim 13 (Adaptive router details)
    ├── Claim 14 (Cost model config)
    ├── Claim 15 (Safety module)
    ├── Claim 16 (Red-team module)
    └── Claim 19 (Export formats)
```

---

*Document Status: DRAFT - For Internal Review*
*Version: 1.0*
