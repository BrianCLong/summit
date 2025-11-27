# Getting Started

This guide will walk you through the process of installing the Auto-Scientist SDK, setting up your first project, and running the automated research loop.

## 1. Installation

The SDK and its core dependencies can be installed directly from PyPI. To include all optional dependencies for the CLI, LLM integration, and visualization, you can install the `[all]` extra.

```bash
pip install "auto-scientist[all]"
```

Verify the installation by checking the version:

```bash
auto-scientist --version
```

## 2. Initializing a Project

The `init` command scaffolds a new research project with a standard directory structure and configuration files.

```bash
auto-scientist init my-first-research
cd my-first-research
```

This will create the following structure:

```
my-first-research/
├── .gitignore
├── artifacts/
├── config.yaml
├── curriculum.yaml
├── experiment.py
└── graph.json
```

## 3. Configuring the LLM Planner

Before you can run the research loop, you need to configure an LLM to act as the planner. Open the `config.yaml` file.

The key fields to edit are `provider` and `model`. By default, it's configured for OpenAI's `gpt-4-turbo`. You can change this to any provider supported by `litellm`, such as Anthropic or Google.

```yaml
# config.yaml
planner:
  provider: "openai" # or "anthropic", "gemini", etc.
  model: "gpt-4-turbo"
```

You also need to provide an API key. **It is strongly recommended to set this via an environment variable** for security reasons.

```bash
export OPENAI_API_KEY="sk-..."
# or ANTHROPIC_API_KEY, GOOGLE_API_KEY, etc.
```

## 4. Defining the Research Curriculum

The `curriculum.yaml` file defines the stages of your research. The default template provides a simple three-stage curriculum for a machine learning task. You can edit this file to match your specific research goals, defining the metrics and thresholds required to advance from one stage to the next.

## 5. Implementing the Experiment

The `experiment.py` file contains the `train_fn`, which is the core of your custom logic. This is the function that the `ExperimentRunner` will call for each proposed experiment.

You should edit this function to load your data, train your model, and return a dictionary of metrics.

## 6. Running the Auto-Scientist

Once your configuration and experiment logic are in place, you can start the automated research loop with the `run` command.

```bash
auto-scientist run
```

The system will now:
1.  Load the current state of your `graph.json` and `curriculum.yaml`.
2.  Call the LLM planner with the current state to get a proposal for the next experiment.
3.  Execute the proposed experiment by calling your `train_fn` in `experiment.py`.
4.  Update the `graph.json` with a new `EVAL` node containing the results.
5.  Check if the curriculum's advancement criteria have been met.
6.  Repeat.

## 7. Visualizing the Graph

At any point, you can generate a visualization of the experiment graph to see the progress of your research.

```bash
auto-scientist graph viz -o research-dag.png
```

This will produce a PNG image showing the relationships between all the nodes (hypotheses, experiments, etc.) in your project.
