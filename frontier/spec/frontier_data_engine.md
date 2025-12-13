# Frontier Data & Signals Engine v0.1 Specification

## 1. Overview
The Frontier Data & Signals Engine is a telemetry-driven data selection and generation system designed to fuel the training of frontier-scale language models. It closes the loop between training/evaluation telemetry and the data mix, enabling dynamic curriculum adjustment and synthetic trace generation.

## 2. Goals
- **G1**: Stand up a data engine for pretraining/fine-tuning.
- **G2**: Build a synthetic tool/graph trace generator.
- **G3**: Implement a telemetry-driven data selection/reweighting loop.
- **G4**: Crystallize IP around data curricula, synthetic traces, and telemetry-closed-loop.

## 3. Architecture

### 3.1 Logical Components

#### Data Lake
- **Storage**: Sharded storage of web text, code, math, and tool/agent traces (real + synthetic).
- **Metadata**: Per-sample metadata including:
  - `domain`
  - `task_type`
  - `difficulty`
  - `safety_tags`
  - `tool_set`
  - `graph_coverage`
  - `source_license`

#### Synthetic Trace Generator
- **Template Library**:
  - API/tool workflows.
  - Multi-hop reasoning chains.
  - IntelGraph subgraphs and traversals.
- **Mechanism**: Uses smaller models + deterministic programs, with optional human-in-the-loop for high-value templates.

#### Telemetry Ingestor
- Reads training/eval logs from the Frontier Training Stack.
- **Metrics**:
  - Per-tag loss, error patterns.
  - Tool success/failure rates.
  - Safety violations / refusal rates.

#### Curriculum & Sampling Policy
- Maps telemetry to changes in:
  - Sampling weights by tag/domain.
  - Synthetic generation focus (e.g., "more multi-tool traces involving planning").
  - Context length distribution.

### 3.2 Interfaces

#### Data Engine APIs

```python
# Request a stream of training batches
stream = data_engine.get_stream(
    profile="frontier_core_v0",
    batch_size=bs,
    seed=seed,
)

# Push telemetry from training/eval
data_engine.submit_telemetry({
    "run_id": "...",
    "metrics": {...},
    "tag_stats": {...},
})
```

## 4. Schemas

Schemas are defined in `/impl/data_engine/schemas/`:
- `sample.schema.json`: General data sample structure.
- `trace.schema.json`: Structure for tool/agent traces.
- `graph.schema.json`: Structure for graph-based supervision.

## 5. Policies
- **Sampling**: Telemetry-driven reweighting of data sources.
- **Safety**: Integration of safety policies into generation templates.
