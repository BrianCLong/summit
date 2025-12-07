# Experiment-Graph Schema

This document defines the schema for the experiment-graph, a directed acyclic graph (DAG) representation of the scientific process. The graph is composed of typed nodes and edges that capture the relationships between different components of an experiment.

## Storage

The canonical representation of the graph will be a JSONL file, where each line is a JSON object representing a node or an edge. This allows for easy append-only storage and streaming processing. An in-memory graph object will be used for efficient traversal and manipulation at runtime.

## Core Components

### Nodes

Nodes represent the fundamental entities in an experiment. Each node has a unique `id`, a `type`, a `timestamp`, and a `metadata` block containing type-specific attributes.

| Type             | Description                                                                                             | Metadata Attributes (Examples)                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `hypothesis`     | A testable statement or question that an experiment aims to investigate.                                | `statement`: "Using a larger learning rate will improve convergence." |
| `dataset`        | A specific version of a dataset used in an experiment.                                                  | `name`: "IMDB", `version`: "v1.0", `source_uri`: "...", `checksum`: "..." |
| `transform`      | A data preprocessing or feature engineering step.                                                       | `function`: "normalize_text", `parameters`: {"lowercase": true}     |
| `model`          | A specific model architecture or configuration.                                                         | `architecture`: "BERT-base", `parameters`: {"layers": 12}          |
| `training-run`   | The execution of a model training process.                                                              | `hyperparameters`: {"lr": 0.001}, `epochs`: 3, `batch_size`: 32      |
| `eval`           | The result of evaluating a trained model on a dataset.                                                  | `metrics`: {"accuracy": 0.92, "f1": 0.91}, `dataset_id`: "..."      |
| `analysis`       | An interpretation or summary of evaluation results, often linking back to a hypothesis.                 | `summary`: "The larger learning rate led to faster convergence..." |

### Edges

Edges define the relationships between nodes, forming the structure of the DAG. Each edge has a `source` and `target` node ID, a `type`, and a `timestamp`.

| Type           | Description                                                                                         | Example Usage                                    |
| -------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `depends_on`   | A general-purpose dependency relationship. The target node requires the source node as an input.     | `training-run` -> `depends_on` -> `model`        |
| `refines`      | The target node is an improvement or iterative development upon the source node.                    | `model-v2` -> `refines` -> `model-v1`            |
| `contradicts`  | The result in the target node contradicts or invalidates the source node (typically a hypothesis).    | `analysis` -> `contradicts` -> `hypothesis`      |
| `supersedes`   | The target node makes the source node obsolete or irrelevant.                                       | `hypothesis-v2` -> `supersedes` -> `hypothesis-v1` |

## Example JSONL Representation

```jsonl
{"id": "hyp_01", "type": "hypothesis", "timestamp": "...", "metadata": {"statement": "BERT is better than GloVe for sentiment analysis."}}
{"id": "dset_01", "type": "dataset", "timestamp": "...", "metadata": {"name": "IMDB", "version": "v1"}}
{"id": "model_01", "type": "model", "timestamp": "...", "metadata": {"architecture": "BERT-base"}}
{"id": "run_01", "type": "training-run", "timestamp": "...", "metadata": {"hyperparameters": {"lr": 1e-5}}}
{"id": "eval_01", "type": "eval", "timestamp": "...", "metadata": {"metrics": {"accuracy": 0.93}}}
{"source": "model_01", "target": "run_01", "type": "depends_on", "timestamp": "..."}
{"source": "dset_01", "target": "run_01", "type": "depends_on", "timestamp": "..."}
{"source": "run_01", "target": "eval_01", "type": "depends_on", "timestamp": "..."}
{"source": "hyp_01", "target": "eval_01", "type": "depends_on", "timestamp": "..."}
```
