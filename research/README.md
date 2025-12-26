# Research Track

This directory contains the **Research Track** for Summit. Code here is strictly for exploration and experimentation.

## Principles

1.  **Isolation**: Research code must not be imported by production (GA) code.
2.  **Ephemeral**: Experiments are temporary. They either graduate to GA or are deleted.
3.  **Measurable**: All experiments must have defined metrics.

## Experiment Lifecycle

1.  **Declaration**: Create a manifest file for the experiment.
2.  **Execution**: Run the experiment in isolation.
3.  **Review**: Analyze metrics against exit criteria.
4.  **Disposition**: Promote to GA (move code) or Decommission (delete code).

## Directory Structure

*   `src/`: Shared research utilities (manifest validation, metric capture).
*   `experiments/`: Directory for individual experiments. Each experiment should be in its own subdirectory.
