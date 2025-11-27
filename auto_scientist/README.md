# Auto-Scientist SDK

[![CI](https://github.com/example/auto-scientist/actions/workflows/ci.yml/badge.svg)](https://github.com/example/auto-scientist/actions/workflows/ci.yml)
[![PyPI version](https://badge.fury.io/py/auto-scientist.svg)](https://badge.fury.io/py/auto-scientist)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A framework for orchestrating and automating scientific research with LLM agents.**

---

Auto-Scientist provides a structured, extensible, and reproducible framework for building autonomous research agents. It models the scientific process as a directed acyclic graph (DAG) of hypotheses, datasets, experiments, and analyses, allowing an LLM-powered planner to intelligently propose next steps in a research curriculum.

### Key Features

*   **Experiment DAG:** Models the research process as a graph, providing a powerful, structured representation for an LLM agent to reason over.
*   **Curriculum Engine:** Guides the research from baselines to ablation studies and generalization, ensuring a structured and efficient discovery process.
*   **Provider-Agnostic LLM Planner:** Integrates with `litellm` to support any major LLM provider (OpenAI, Anthropic, Gemini, etc.) for planning experiments.
*   **Reproducibility First:** Automatically tracks code versions, dependencies, and artifacts for every experiment, ensuring full reproducibility.
*   **Powerful CLI:** A rich command-line interface for initializing projects, running experiments, and visualizing the research graph.
*   **Pluggable Architecture:** Core components like storage and planning are designed to be extensible.

### Quick Start

1.  **Installation:**

    ```bash
    pip install "auto-scientist[all]"
    ```

2.  **Initialize a New Project:**

    This scaffolds a new project directory with the necessary configuration files and experiment scripts.

    ```bash
    auto-scientist init my-research-project
    cd my-research-project
    ```

3.  **Configure your LLM Provider:**

    Edit `config.yaml` to specify your preferred LLM provider and model for the planner.

    ```yaml
    # config.yaml
    planner:
      provider: "openai" # or "anthropic", "gemini", etc.
      model: "gpt-4-turbo"
      # api_key: "sk-..." (can be set via environment variable OPENAI_API_KEY)
    ```

4.  **Run the Research Loop:**

    This will start the main loop: the LLM planner proposes experiments, the runner executes them, and the curriculum advances based on the results.

    ```bash
    auto-scientist run
    ```

5.  **Visualize the Results:**

    Generate a visual representation of the Experiment DAG.

    ```bash
    auto-scientist graph viz --output-file research_dag.png
    ```

### Architecture Overview

The Auto-Scientist SDK is built on a few core components:

*   **Storage Backend:** A pluggable system for persisting the experiment graph and all associated artifacts. The default is a local file-based backend.
*   **Experiment Graph:** The central data structure representing the state of the research.
*   **Curriculum:** A series of stages that define the goals and constraints of the research.
*   **Planner:** The "brain" of the system, responsible for proposing new experiments based on the current graph and curriculum.
*   **Runner:** The "hands" of the system, responsible for executing experiments in an isolated and reproducible manner.

This modular design allows for easy extension and integration with other tools and platforms.

---

This project is currently in beta. Feedback and contributions are welcome!
