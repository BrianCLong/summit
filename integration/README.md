# Integration Plan

This document outlines the plan for integrating the Auto-Scientist stack with existing platforms like Summit, IntelGraph, and Maestro Conductor.

## Phase 1: Core Integration with IntelGraph

-   **Goal:** Visualize the experiment-graph in the IntelGraph UI.
-   **Steps:**
    1.  Define a mapping from the JSONL experiment-graph format to the Neo4j graph schema used by IntelGraph.
    2.  Create a simple ingestion script or service that watches for new experiment-graph logs and pushes them to the Neo4j database.
    3.  Configure the IntelGraph UI to recognize the new node and edge types (`hypothesis`, `training-run`, `refines`, etc.) for proper visualization.

## Phase 2: Orchestration with Maestro Conductor

-   **Goal:** Use Maestro Conductor as a robust, scalable backend for the experiment runner.
-   **Steps:**
    1.  Define a Maestro Conductor workflow specification for a generic training/evaluation job.
    2.  Implement a "Maestro Runner" backend for the Auto-Scientist SDK that translates an experiment node from the graph into a Maestro Conductor workflow execution.
    3.  Ensure that telemetry (logs, metrics, artifacts) from the Maestro workflow is correctly streamed back and recorded in the experiment-graph.

## Phase 3: User Interface in Summit

-   **Goal:** Provide a user interface within the Summit application for creating, managing, and observing Auto-Scientist runs.
-   **Steps:**
    1.  Design a UI for defining or selecting a curriculum specification.
    2.  Create a view to launch a new Auto-Scientist run, linking it to a high-level user goal.
    3.  Integrate the IntelGraph visualization (from Phase 1) into a dashboard to provide a real-time view of the experiment's progress.
