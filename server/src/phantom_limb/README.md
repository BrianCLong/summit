# Project PHANTOM LIMB: Dead Analyst Resurrection

## Overview

Project PHANTOM LIMB is a simulated system for reconstituting the cognition of deceased master analysts into permanent autonomous agents within the Summit platform. By processing all known digital artifacts of an analyst (emails, notes, recordings, graph edits), the system creates a "Digital Ghost" that can continue to provide analysis and insight.

This module provides an API to manage these resurrected analysts, including bringing new ones "online" and querying them for information.

**Note:** This is a conceptual simulation. No actual consciousness is being replicated.

## Core Concepts

-   **Digital Artifacts:** The source material for resurrection. This is a collection of all digital records left behind by an analyst.
-   **Digital Ghost:** The end product of the reconstitution process. A Digital Ghost is an autonomous agent that models the thinking patterns, expertise, and analytical style of the original analyst. Each ghost has a unique ID, status, and list of expertise.
-   **Reconstitution:** The computationally intensive (and simulated) process of analyzing the digital artifacts and creating the Digital Ghost.
-   **Querying:** The act of posing an analytical question to a Digital Ghost and receiving a response that mimics the likely output of the original analyst.

## Pre-Loaded Agents

The service is pre-initialized with three legendary analysts who are already "back online":

-   `pl-ghost-001`: John Perry Barlow
-   `pl-ghost-002`: Grace Hopper
-   `pl-ghost-003`: Alan Turing

## API Endpoints

-   `GET /api/phantom-limb/analysts`: Retrieves a list of all currently active Digital Ghost agents.
-   `POST /api/phantom-limb/reconstitute`: Initiates the resurrection of a new analyst. The request body must contain an `AnalystArtifacts` object. This is a long-running, asynchronous process that returns the newly created `DigitalGhost` profile upon completion.
-   `POST /api/phantom-limb/query/{ghostId}`: Poses a query to a specific Digital Ghost. The request body must contain a `query` string. It returns a `GhostQueryResponse` with the agent's analysis.

## Workflow

1.  **List Active Ghosts:** Call `GET /api/phantom-limb/analysts` to see which agents are available for querying.
2.  **Query an Agent:** Select a `ghostId` from the list and `POST` a question to the `/api/phantom-limb/query/{ghostId}` endpoint.
3.  **Resurrect a New Agent (Optional):** To create a new agent, `POST` an `AnalystArtifacts` payload to `/api/phantom-limb/reconstitute`.
