# Release Notes: SRE v0.1

## Summary
Initial release of the Summit Reasoning Evaluator (SRE), a graph-native framework for evaluating complex agentic reasoning.

## Key Features
*   **Graph Schema**: `episode.schema.json` defines a standard format for reasoning DAGs (Thoughts, Calls, Observations).
*   **Reference Implementation**: Pure Python `sre` package with Pydantic models and a CLI runner.
*   **Evaluation Harness**: Pluggable `Metric` interface with out-of-the-box support for `TraceLength`, `ToolEfficiency`, and `ExactMatch`.
*   **Mock Benchmark**: Initial experimental results on synthetic math reasoning data.

## Integration
*   Added `summit_example.py` demonstrating how to map Summit event streams to SRE Episodes.

## Known Limitations
*   **Regex Adapters**: The current parsing logic is heuristic-based and may fail on unstructured LLM outputs.
*   **Mock Metrics**: `ExactMatch` currently requires simple string equality; future versions will support semantic similarity.
*   **No Persistence**: Results are written to CSV/stdout; database integration is planned for v0.2.

## Roadmap (v0.2)
*   **Postgres Storage**: Persist Episodes and Scores.
*   **LLM-as-a-Judge**: Implement `StepConsistency` metric using GPT-4.
*   **Visualizer**: React component for rendering Episode graphs.
