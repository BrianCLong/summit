# Engineering Discovery Process

## Overview

This document defines the process for running Engineering Discovery Sprints. The goal is to get fast answers and build fewer wrong things.

## Workflow

1.  **Trigger**: Uncertain Wishbook items or high-risk features trigger a Discovery Sprint.
2.  **Time-box**: Sprints are time-boxed to 1–2 weeks. No open-ended research.
3.  **Execution**:
    - **Prototype the Hardest Thing First**: Don't build the easy UI; build the core engine or integration.
    - **Validate**: Show it to 3-5 customers or internal stakeholders.
4.  **Output**:
    - Create a `DISCOVERY_TEMPLATE.md` artifact.
    - Fill in the **Technical Risk Register**.
    - Provide **Effort Estimates** with confidence bands (not fake precision).
5.  **Decision (Go/No-Go)**:
    - At sprint end, a decision MUST be made. No limbo.
    - **Go**: Convert to Spec and schedule.
    - **No-Go**: Document why and archive.
6.  **Cleanup**:
    - Delete discovery work (code) that doesn't end in a decision or isn't used. Do not leave "prototype code" rotting in the main branch.

## Key Principles

- **Fast Answers**: Speed is the primary metric.
- **Evidence-Based**: Decisions must be backed by data or customer feedback.
- **Kill Early**: It is a success to kill a bad idea early.

## Artifacts

- Template: `planning/enablement-pack/DISCOVERY_TEMPLATE.md`
