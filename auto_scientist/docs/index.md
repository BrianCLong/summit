# Welcome to the Auto-Scientist SDK

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

Ready to get started? Check out the [Getting Started guide](getting-started.md).
