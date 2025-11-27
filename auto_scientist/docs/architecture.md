# Architecture

This document provides a high-level overview of the Auto-Scientist SDK's architecture. The system is designed to be modular, extensible, and reproducible.

## Core Components

The SDK is built around five core components that work together to automate the research process.

![Architecture Diagram](assets/architecture.png)  <!-- Placeholder for a diagram -->

### 1. Storage Backend (`storage.py`)

The Storage Backend is the foundation of the system, responsible for all state persistence. It's designed as a pluggable interface (`StorageBackend` protocol), decoupling the core logic from the storage implementation.

*   **Default Implementation:** `FileStorageBackend` saves the graph to a single `graph.json` file and stores all artifacts (models, datasets, logs) in a structured `/artifacts` directory.
*   **Responsibilities:**
    *   Initializing a new project environment.
    *   Atomically loading and saving the `ExperimentGraphModel`.
    *   Storing and retrieving versioned artifacts associated with specific graph nodes.
*   **Extensibility:** A different backend (e.g., `PostgresStorageBackend`) could be implemented to support multi-user collaboration or larger-scale projects.

### 2. Experiment Graph (`graph.py`)

The `ExperimentGraph` is the central in-memory representation of the research state. It acts as the primary, high-level interface for the rest of the application.

*   **Function:** It orchestrates all changes to the graph (adding nodes/edges) and ensures they are immediately persisted via the storage backend.
*   **Transactional:** Every operation like `add_node` or `add_edge` is an atomic transaction that includes saving the state to disk, making the system resilient to interruptions.
*   **Data Model:** The underlying data structures (`Node`, `Edge`, `ExperimentGraphModel`) are defined in `schemas.py` using `Pydantic` for robust validation and serialization.

### 3. Curriculum (`curriculum.py`)

The `Curriculum` defines the high-level research plan. It's a declarative system, loaded from a user-defined YAML file (`curriculum.yaml`).

*   **Structure:** Composed of `CurriculumStage`s, each with a name, description, goals, and a set of `StageConstraint`s.
*   **Progression:** The `can_advance` method evaluates the current `ExperimentGraph` against the current stage's constraints (e.g., `required_metrics`, `max_runs`) to determine if the curriculum can progress to the next stage.
*   **User-Centric:** This design allows users to define complex research strategies without writing any code.

### 4. Planner (`planner.py`)

The `Planner` is the "brain" of the auto-scientist. It is responsible for deciding what experiment to run next.

*   **Interface:** The `Planner` protocol defines a single method, `propose_experiments`, which takes the current graph and curriculum stage and returns a list of `ProposedExperiment`s.
*   **LLM Implementation:** `LLMPlanner` is the primary implementation. It:
    *   Uses `litellm` to be provider-agnostic (works with OpenAI, Anthropic, Gemini, etc.).
    *   Constructs a detailed prompt from an external template (`planner.prompt.yaml`), providing the LLM with the full context of the research.
    *   Parses the structured YAML response from the LLM into `ProposedExperiment` objects.
*   **Extensibility:** Users could create their own planners (e.g., a `GridSearchPlanner`) that conform to the same protocol.

### 5. Runner (`runner.py`)

The `Runner` is the "hands" of the auto-scientist. It is responsible for the actual execution of experiments.

*   **Isolation and Reproducibility:** The `ExperimentRunner` executes the user-defined `train_fn` in a separate, isolated subprocess. This is the key to reproducibility and robustness.
*   **Provenance Tracking:** Before execution, it captures a detailed `RunRecord` that includes:
    *   The exact configuration of the run.
    *   The Git commit hash of the codebase.
    *   A snapshot of the Python environment (`pip freeze`).
    *   All stdout, stderr, and exceptions from the subprocess.
*   **Graph Integration:** After a run completes, the runner creates a new `EVAL` node in the graph, attaching the `RunRecord` and any resulting metrics to its payload. This ensures that every action is audited and becomes part of the persistent research record.

## Data and Control Flow

The main `run` loop, orchestrated by the CLI, follows this sequence:

1.  **Load State:** The `Project` context is created, loading the `ExperimentGraph` and `Curriculum` from the `FileStorageBackend`.
2.  **Plan:** The `LLMPlanner` is given the current graph and curriculum stage. It queries an LLM to generate `ProposedExperiment`s.
3.  **Run:** The `ExperimentRunner` takes the top proposal, executes the `train_fn` in an isolated subprocess, and captures the `RunRecord`.
4.  **Update State:** The runner adds a new `EVAL` node to the graph with the results. This is transactionally saved to `graph.json`.
5.  **Advance:** The `Curriculum`'s `can_advance` method is checked against the updated graph. If the criteria are met, the curriculum's stage index is incremented.
6.  **Loop:** The process repeats.
