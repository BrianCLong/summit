# Reasoning Budget & Evidence Strength

This document defines the controls for GraphRAG reasoning depth and evidence grading.

## ReasoningBudget

The `ReasoningBudget` object controls the cost and depth of graph exploration.

### Fields

*   **explore** (`ExplorationBudget`):
    *   `max_hops` (int): Maximum depth of traversal (default: 3).
    *   `max_nodes` (int): Maximum nodes to visit (default: 500).
    *   `max_paths` (int): Maximum paths to collect (default: 50).
    *   `stop_when` (`StopCondition`): Condition to terminate search.
    *   `min_proofs` (int): Only required if `stop_when` is `min_proofs`.

*   **explain** (`ExplanationBudget`):
    *   `max_hops` (int): Max path length in final explanation.
    *   `max_paths_in_answer` (int): Max number of paths to cite.

*   **grade** (`GradingPolicy`):
    *   `mode` (`GradeMode`): Strictness of evidence grading.

### Enums

**StopCondition**:
*   `first_proof`: Stop as soon as one valid path is found.
*   `min_proofs`: Stop after `min_proofs` valid paths.
*   `budget_exhausted`: Continue until max_hops/max_nodes is reached.

**GradeMode**:
*   `strict`: Requires high confidence and multiple sources.
*   `balanced`: Standard RAG behavior.
*   `permissive`: Allow speculative connections (must be labeled).
