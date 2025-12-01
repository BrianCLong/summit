# Project ORACLE: Causal Time-Loop Forecasting Engine

## Overview

Project ORACLE is a simulated implementation of a prophetic forecasting engine. It is based on the concept of using Fully Homomorphic Encryption (FHE) and quantum-inspired tensor networks to run millions of narrative simulations in parallel.

The core idea is to back-propagate the simulations that align with future ground truth, effectively training the engine to become prophetic. This module simulates this process, providing an API to initiate forecasting runs and retrieve the high-confidence results.

**Note:** This is a conceptual simulation and does not perform any actual quantum computing or FHE.

## Core Concepts

- **Simulation Run:** An asynchronous job that represents a single forecasting request. Each run is defined by a set of `SimulationParameters`.
- **Simulation Parameters:** The inputs for a run, including:
    - `narrativeQuery`: The central question or event to forecast.
    - `horizonDays`: The time horizon (e.g., 30, 90, 180 days).
    - `eventSigmaThreshold`: The statistical significance of events to find (e.g., `4.0` for 4-sigma events).
- **Prophetic Truth:** The final output of a successful simulation. It is a high-confidence, validated prediction of a future event, complete with a predicted date and a confidence score.

## API Endpoints

- `POST /api/oracle/run-simulation`: Initiates a new forecasting simulation. This is an asynchronous operation. It accepts `SimulationParameters` in the request body and returns a `SimulationRun` object with a unique `runId` and an initial status of `running`.
- `GET /api/oracle/timeline/{runId}`: Retrieves the status and results of a specific simulation run. You can poll this endpoint using the `runId` from the previous step. When the run's status is `complete`, the `validatedTruths` array will contain the prophetic forecast.

## Workflow

1.  **Initiate Simulation:** Send a `POST` request to `/api/oracle/run-simulation` with your query and parameters.
2.  **Receive Run ID:** The API will immediately respond with a `SimulationRun` object containing a unique `runId`.
3.  **Poll for Results:** Periodically send a `GET` request to `/api/oracle/timeline/{runId}` to check the status.
4.  **Retrieve Forecast:** Once the status changes to `complete`, the `validatedTruths` field in the response will be populated with the high-confidence predictions.
