# Commercial Brief: Auto-Scientist SDK v0.1

## Value Proposition

The Auto-Scientist SDK provides a powerful, curriculum-guided framework for orchestrating complex machine learning experiments. Unlike traditional AutoML, which focuses on hyperparameter optimization, our SDK allows a Large Language Model (LLM) to act as a research scientist, intelligently navigating the experimental process from hypothesis to analysis. This leads to faster discovery, more reproducible results, and a more efficient use of computational resources.

## Key Features

-   **Experiment-Graph Representation:** Captures the entire research process in a structured, queryable graph.
-   **Curriculum-Guided Planning:** Uses a declarative curriculum to guide the LLM planner, ensuring a systematic and logical progression of experiments.
-   **Pluggable Runner:** Can execute experiments on local machines or be extended to run on remote compute backends.
-   **Provenance-First Telemetry:** Every experimental artifact is logged with rich metadata, ensuring full reproducibility and governance.

## Target Audience

-   AI Research Organizations & Model Labs
-   MLOps Platforms seeking to add intelligent automation
-   Enterprise R&D groups in regulated industries (e.g., pharma, finance)

## Licensable Units & Pricing Dimensions

-   **Auto-Scientist SDK:** A licensed library with APIs like `propose_experiments()`, `run_graph()`, and `summarize_findings()`.
-   **Pricing Levers:**
    -   Per-seat for individual researchers.
    -   Per-experiment-graph run for consumption-based models.
    -   OEM license for integration into larger platforms.

## Integration Strategy

The SDK is designed for seamless integration with existing MLOps ecosystems. Initial integration targets include:
-   **Summit / IntelGraph:** The experiment-graph can be visualized and explored within the IntelGraph UI.
-   **Maestro Conductor:** The experiment runner can be implemented as a Maestro Conductor workflow, allowing for robust, scalable execution.
