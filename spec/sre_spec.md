# Summit Reasoning Evaluator (SRE) Specification v0.1

## 1. Introduction
The Summit Reasoning Evaluator (SRE) is a specialized harness for evaluating complex, multi-step reasoning systems. Unlike traditional "question-answer" evaluators, SRE treats the *process* of reasoning as a first-class citizen, modeling it as a Directed Acyclic Graph (DAG) of thoughts, tool calls, and observations. This specification defines the data models, interfaces, and protocols for SRE.

## 2. Formal Notation
We define a **Reasoning Episode** $E$ as a tuple:
$$ E = (C, G, \Omega, M) $$

Where:
*   $C$: **Context/Configuration**. The initial task, prompt, and system parameters.
*   $G = (V, E_{d})$: The **Reasoning Graph**.
    *   $V$: Set of nodes representing discrete events (Thought, Call, Observation).
    *   $E_{d}$: Set of directed edges representing causal or temporal dependencies.
*   $\Omega$: The **Outcome**. The final artifact produced by the agent.
*   $M$: **Metrics**. A set of scalar or vector valuations derived from $E$.

## 3. Data Model
The canonical serialization format is **JSONL**, where each line adheres to the `episode.schema.json`.

### Node Types ($T_{node}$)
*   `thought`: Internal monologue or Chain-of-Thought (CoT) step.
*   `call`: Usage of an external tool or function.
*   `observation`: The return value from a tool.
*   `correction`: A self-correction step.
*   `communication`: Message exchange in multi-agent settings.

### Edge Relations ($R_{edge}$)
*   `follows`: Temporal sequence (default).
*   `depends_on`: Explicit data dependency.
*   `corrects`: Node B revises Node A.
*   `refines`: Node B adds detail to Node A.

## 4. Interfaces

### 4.1. Core Evaluator
The primary entry point for the Python SDK.

```python
class Evaluator:
    def evaluate_run(self, trace: Union[Dict, List], config: EvalConfig) -> EvalReport:
        """
        Ingests a raw trace (list of spans or graph), normalizes it to an Episode,
        computes configured metrics, and returns a report.
        """
        pass
```

### 4.2. Metric Interface
Metrics are pluggable functions that operate on the Episode graph.

```python
class Metric(ABC):
    @abstractmethod
    def compute(self, episode: Episode) -> float:
        """Returns a scalar score."""
        pass

    @property
    def name(self) -> str:
        pass
```

**Standard Metrics:**
*   `ExactMatch`: Checks $\Omega$ against ground truth.
*   `StepConsistency`: Uses an LLM judge to verify if Node $N_{i+1}$ logically follows $N_i$.
*   `ToolEfficiency`: Ratio of useful tool calls to total calls.
*   `GraphComplexity`: Measures branching factor and depth.

### 4.3. Curriculum Policy
Controls the sequence of tasks presented to the agent.

```python
class CurriculumPolicy(ABC):
    @abstractmethod
    def next_task(self, history: List[EvalReport]) -> TaskConfig:
        """Selects the next task based on past performance."""
        pass
```

## 5. CLI & Runtime
The `sre` CLI provides a standard interface for running evals.

```bash
# Run a specific evaluation suite
sre run --suite math_reasoning_v1 --model gpt-4-turbo

# Evaluate a pre-existing trace file
sre eval --trace runs.jsonl --metrics basic,step_consistency
```

## 6. Integration Hooks
To integrate with Summit/IntelGraph, systems must emit traces that can be mapped to the SRE graph schema.

**Summit Hook:**
```python
# In Summit Orchestrator
from sre.sdk import normalize_trace

def on_run_complete(run_data):
    episode = normalize_trace(run_data)
    sre.submit(episode)
```

## 7. Complexity Analysis
Evaluating `StepConsistency` requires $O(|V|)$ LLM calls in the naive case. SRE optimizations include:
*   **Sampling**: Checking only critical path nodes ($O(\log |V|)$).
*   **Batching**: Grouping step checks into single LLM prompts.
