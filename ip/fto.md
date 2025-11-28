# Freedom to Operate (FTO) Memo: SRE v0.1

**Date:** 2025-05-15
**Subject:** IP Risks & Design-Arounds for Summit Reasoning Evaluator

## 1. Executive Summary
A preliminary review of the landscape suggests a "Yellow" risk level. While general "LLM Evaluation" is a crowded field, our specific approach (Graph-Structured Episodes + Curriculum Policy) appears distinct from the dominant "Span-based" (OpenTelemetry) and "Unit-Test" (DeepEval) paradigms.

## 2. Potential Conflicts

### A. Trace Visualization (LangSmith / Arize)
*   **Risk**: Patents related to "Visualizing hierarchical execution traces of language models".
*   **Mitigation**: SRE focuses on the *computational graph* (DAG) aspect—specifically "Correction" and "Merge" edges—rather than the temporal "Call Stack" visualization. Our UI should emphasize the *topology* (loops, branches) rather than the *timeline*.

### B. Feedback Functions (TruLens)
*   **Risk**: Methods for "programmatically evaluating output quality using feedback functions".
*   **Mitigation**: Avoid the term "Feedback Function". Use "Topological Metric" or "Structural Predicate". Our core claims focus on graph structure analysis, not just output scoring.

### C. Active Learning / Curriculum
*   **Risk**: General patents on "Automated Curriculum Learning".
*   **Mitigation**: Narrow our claims to "Curriculum for *Evaluation*" (finding the failure boundary), distinct from "Curriculum for *Training*".

## 3. Design-Around Strategy
1.  **Enforce Graph Strictness**: Ensure our schema *requires* explicit edge definitions, differentiating it from loose "log streams".
2.  **Coupling**: Tighten the link between the "Curriculum Policy" and the "Evaluation Report", making them an inseparable feedback loop system (System Claim) rather than just a method.

## 4. Conclusion
Proceed with filing. The "Graph-Native" angle provides sufficient novelty distance from existing "Log-Native" solutions.
