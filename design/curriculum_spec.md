# Curriculum Specification Format

The Curriculum Engine guides the LLM planner by providing a structured sequence of stages for an experiment. This specification is defined in a declarative YAML file.

## Structure

The curriculum is a list of stages. Each stage is an object with a `stage` name, a list of `goals`, and an object of `constraints`.

-   `stage` (string, required): A unique name for the stage (e.g., `baseline`, `ablation`, `generalization`).
-   `goals` (list of strings, required): A list of high-level objectives for the LLM planner to achieve during this stage. These are interpreted by the LLM.
-   `constraints` (object, optional): A set of hard rules that the planner must follow.

## Example Specification

```yaml
# A curriculum for a typical model improvement task.

- stage: problem_scoping
  goals:
    - "Define the core problem and identify key metrics from the user's high-level goal."
    - "Select a suitable public dataset for initial experiments."
  constraints:
    allowed_datasets: ["imdb", "squad", "cifar10"] # Can be a list of allowed resources

- stage: baseline_reproduction
  goals:
    - "Reproduce the performance of a known baseline model from a paper or public benchmark."
    - "Establish a solid performance metric to beat."
  constraints:
    max_runs: 5
    max_runtime_per_run_minutes: 60
    required_metrics: ["accuracy", "f1_score"]

- stage: focused_ablations
  goals:
    - "Identify the most impactful model/data components by systematically removing them."
    - "Generate hypotheses about which factors are critical for performance."
  constraints:
    max_runs: 10
    allow_model_architecture_changes: false # Constraint on the type of changes

- stage: generalization_checks
  goals:
    - "Test the best model on an out-of-distribution dataset."
    - "Verify that improvements are not just overfitting to the primary test set."
  constraints:
    min_ood_datasets: 1
```

## How it's used

The **Planner (LLM)** receives the *current experiment graph* and the *current curriculum stage* as input. It then proposes new nodes and edges for the graph that are consistent with the stage's `goals` and `constraints`. The **Curriculum Engine** is responsible for advancing from one stage to the next once the goals of the current stage are met (as determined by analyzing the experiment graph).
