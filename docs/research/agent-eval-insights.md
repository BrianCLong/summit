# Agent Evaluation Insights (2026)

## State of the Art: Multi-Step Agent Evaluation
Evaluating autonomous agents fundamentally differs from assessing single-turn LLM responses. The transition to agentic behavior introduces compounding errors where minor mistakes in early steps (e.g., incorrect tool selection) cascade through subsequent actions, leading to significant drops in overall success rates during multi-step execution.

*   **Compounding Errors**: Research indicates that state-of-the-art agents experience substantial performance degradation in multi-step workflows. A 60% success rate on single tasks can plummet to 25% when consistency is required across multiple runs.
*   **Non-Deterministic Failures**: Agents often fail probabilistically, generating plausible yet incorrect outcomes rather than triggering traditional error codes. These failures typically manifest as degraded output quality, increased latency, or unexpected operational costs in production.
*   **Need for Agent-Specific Metrics**: Traditional precision and recall metrics fall short for agents. Robust evaluation frameworks must track granular behaviors, including context maintenance, logical planning execution, and correct tool invocation over time.

## Evaluation Dimensions & Metrics
To address these challenges, advanced evaluation harnesses in 2026 incorporate specific metrics:
1.  **Tool Selection Quality**: Measures whether the agent chose the most appropriate tool for the current sub-task given the available context.
2.  **Action Advancement**: Assesses if a taken action meaningfully advanced the user toward the ultimate goal, avoiding loops or redundant steps.
3.  **Action Completion**: Tracks whether a complex, multi-step objective was fully resolved end-to-end.
4.  **Context Maintenance**: Evaluates the agent's ability to retain and utilize critical information across conversational turns or prolonged execution cycles.

## Summit Bench Expansion Proposals

Based on these insights, we recommend expanding the Summit Bench evaluation harness to explicitly measure multi-step and agentic capabilities. The proposed updates involve new fixtures and structural enhancements compatible with our deterministic RAG evaluation harness (`server/src/ai/evals/harness.ts`).

### Proposed Backlog

1.  **New Metric: Tool Selection Grader**
    *   **Description**: Introduce a new grader function (`tool_selection_match.ts`) to evaluate if the agent correctly identified and invoked the required tool given an input query.
    *   **Integration**: Add `TOOL_SELECTION` as a new evaluation type in `harness.ts`, computing a binary or graded score based on expected vs. actual tool calls.

2.  **New Metric: Action Completeness Grader**
    *   **Description**: Develop a grader (`action_completeness.ts`) to determine if the final output satisfies all required constraints of a complex, multi-step prompt.
    *   **Integration**: Implement as a holistic check complementing `groundednessCheck` and `citationMatch` in `harness.ts`.

3.  **New Fixture: Multi-Step Tool Use**
    *   **File**: `server/src/ai/evals/fixtures/multi_step_tool_use.jsonl`
    *   **Concept**: A suite of test cases designed to force the agent into sequential tool usage.
    *   **Example Case**:
        ```json
        {"id": "multi_step_01", "input": "Find the latest policy document for domain X and summarize its section on data retention.", "type": "agentic", "expected_tools": ["search_policy_docs", "extract_document_section"]}
        ```

4.  **New Fixture: Context Retention (Long-Running Tasks)**
    *   **File**: `server/src/ai/evals/fixtures/context_retention.jsonl`
    *   **Concept**: Cases evaluating the agent's ability to recall constraints set in earlier simulated steps.
    *   **Example Case**:
        ```json
        {"id": "context_retention_01", "input": [{"role": "user", "content": "Remember the reference ID is REF-492."}, {"role": "agent", "content": "Got it."}, {"role": "user", "content": "Now generate a report on recent incidents, citing the reference ID."}], "type": "agentic", "expected": "REF-492"}
        ```

5.  **Harness Enhancements**
    *   Modify `EvalResult` in `harness.ts` to support tracking of intermediate tool calls (e.g., `evidence: { chunk_ids?: string[]; citations?: string[]; tools_invoked?: string[] }`).
    *   Update `scripts/ai/run_ai_evals.mjs` and related metrics reporting to aggregate and report on these new agentic dimensions.
