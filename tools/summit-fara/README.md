# SummitFara: Autonomous Computer-Use Agent

SummitFara is an advanced autonomous agent for the Summit ecosystem, building on Microsoft's Fara-7B architecture. It integrates with IntelGraph for development workflows and uses a co-evolutionary strategy to improve performance on complex tasks.

## Features

- **Base Model**: Designed to wrap Fara-7B or Qwen3-8B.
- **Co-Evolution Loop**:
  - **Curriculum Agent (πθ)**: Generates tasks from `backlog.yaml` and repo state.
  - **Executor Agent (πϕ)**: Executes tasks using visual browser control + Git/Graph tools.
- **Tools**:
  - `browser_action`: Click/Type/Scroll based on screenshot analysis.
  - `graph_query`: Cypher queries against IntelGraph (Neo4j).
  - `gh_cli`: GitHub CLI automation for PRs.
- **Metrics**: Optimized for PR Velocity, Taxonomy Parsing, and Leak-Free Runtime.

## Installation

1. Navigate to the tool directory:
   ```bash
   cd tools/summit-fara
   ```

2. Install dependencies:
   ```bash
   pip install .
   ```

   *Note: Requires Python 3.10+ and the `gh` CLI tool installed.*

## Usage

### Run the Co-Evolution Loop

To start the autonomous improvement cycle:

```bash
fara-cli --task "Evolve SummitFara on latest issues" \
         --endpoint summit_llm.json \
         --max_rounds 200 \
         --intelgraph
```

### Run a Specific Task

```bash
fara-cli --task "Automate YAML taxonomy ingestion PR" --intelgraph
```

## Architecture

### Agents

- **Curriculum Agent**: Scans `backlog.yaml` to identify actionable development tasks.
- **Executor Agent**: Uses a ReAct-style loop (Observation -> Thought -> Action) to complete tasks. It supports:
  - **Visual+Graph Fusion**: combining screenshots with knowledge graph queries.
  - **Repo KL Penalty**: Enforcing coding standards.

### Benchmarks

Targeting **82% overall success rate** vs Fara baselines:
- **PR Velocity@1**: 90% auto-merge
- **Taxonomy Parse@16**: 95% consistency
- **Leak-Free Runtime**: 98%
- **Graph Accuracy**: 85%

## Configuration

Configuration is managed via `pyproject.toml` and runtime arguments. Ensure `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD` are set in your environment for IntelGraph integration.
