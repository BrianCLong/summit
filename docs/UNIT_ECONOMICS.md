# Unit Economics Model

## Workload Classes

We define the following workload classes to map cost and value accurately:

1.  **Read-only Queries**
    - **Description**: Operations that retrieve data without side effects (e.g., Dashboards, Reports, Search).
    - **Unit**: `QueryUnit` (1 standard complexity query).
    - **Cost Drivers**: Compute (DB CPU), Network Egress.
    - **Value Drivers**: User Insight, Decision Support.

2.  **Planning (Non-executing)**
    - **Description**: Agent reasoning steps that generate a plan but do not execute tools.
    - **Unit**: `ReasoningStep`.
    - **Cost Drivers**: LLM Tokens (Input/Output), Latency.
    - **Value Drivers**: Strategy Formation, Error Avoidance.

3.  **Evaluation / Self-testing**
    - **Description**: Automated checks to verify output quality or compliance.
    - **Unit**: `EvalCheck`.
    - **Cost Drivers**: LLM Tokens, Compute (Sandboxed Execution).
    - **Value Drivers**: Reliability, Safety, Compliance Proof.

4.  **Approved Write Actions**
    - **Description**: Operations that modify state (e.g., Create Resource, Update Record).
    - **Unit**: `ActionUnit`.
    - **Cost Drivers**: API Calls, Transaction Overhead, Audit Logging.
    - **Value Drivers**: Task Completion, Business State Progress.

5.  **Multi-agent Coordination**
    - **Description**: Communication and consensus between multiple agents.
    - **Unit**: `CoordinationMessage`.
    - **Cost Drivers**: Message Bus, State Serialization, Context Switching.
    - **Value Drivers**: Complex Problem Solving, Parallelism.

6.  **Plug-ins**
    - **Description**: Execution of external or third-party extensions.
    - **Unit**: `PluginCall`.
    - **Cost Drivers**: External API Fees, Sandbox Overhead.
    - **Value Drivers**: Extended Capabilities, Integration.

## Cost & Value Mapping

| Workload Class   | Primary Cost Driver | Primary Value Driver | Optimization Strategy              |
| :--------------- | :------------------ | :------------------- | :--------------------------------- |
| **Read-only**    | DB Read IOPS        | User Engagement      | Caching, Indexing                  |
| **Planning**     | LLM Tokens          | Success Probability  | Prompt Optimization, caching plans |
| **Evaluation**   | Compute/Tokens      | Risk Reduction       | Sampling, Targeted Evals           |
| **Write Action** | Consistency/Audit   | Business Impact      | Batching, Idempotency              |
| **Multi-agent**  | Context Window      | Solution Quality     | Shared Memory, Summarization       |
| **Plug-ins**     | Latency/Fees        | Feature Reach        | Rate Limiting, Cost Caps           |

## Owners

- **Platform Engineering**: Read-only, Plug-ins
- **AI Systems**: Planning, Multi-agent
- **Compliance**: Evaluation
- **Product**: Write Actions
