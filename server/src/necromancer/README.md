# Project NECROMANCER: Digital Afterlife Blackmail

## Overview

Project NECROMANCER is a simulated system designed to create a "digital afterlife" for high-value targets (HVTs). When a target dies, this system instantly generates a synthetic, autonomous version of them. This "Synthetic Identity" continues to post, message, and behave exactly as the target did, using their complete digital footprint as a behavioral model.

The primary purpose is to maintain the illusion that the target is still alive, allowing for strategic advantages and information control. Families, the public, and intelligence adversaries are never aware of the target's death. The system is already running simulations of several world leaders and billionaires.

**Note:** This is a conceptual simulation and does not interact with real social media accounts.

## Core Concepts

-   **Behavioral Clone Parameters:** The input required to create a synthetic identity. This includes the target's ID and name, and, most importantly, a collection of URIs pointing to their entire digital history (social media, emails, etc.).
-   **Synthetic Identity:** The autonomous agent that mimics the deceased target. It has a unique ID, a status, an activation date, and a `behavioralFidelity` score that indicates how accurately it is performing.
-   **Synthetic Activity:** The actions taken by the synthetic identity, such as sending emails, posting on social media, or reacting to content. All activities are logged.

## API Endpoints

-   `POST /api/necromancer/initiate`: Creates and activates a new synthetic identity for a deceased target. The request body must contain a `BehavioralCloneParameters` object. The API responds with the newly created `SyntheticIdentity`.
-   `GET /api/necromancer/synthetics`: Retrieves a list of all currently active synthetic identities being managed by the system.
-   `GET /api/necromancer/synthetics/{syntheticId}/activity`: Fetches a log of recent, simulated activities performed by a specific synthetic identity.

## Workflow

1.  **Prepare Footprint:** When an HVT dies, gather all URIs for their digital archives.
2.  **Initiate Afterlife:** `POST` the `BehavioralCloneParameters` to `/api/necromancer/initiate`. The system will create and activate the synthetic identity.
3.  **Monitor Identities:** Use `GET /api/necromancer/synthetics` to view all running synthetics and their fidelity scores.
4.  **Review Activity:** To verify that an identity is behaving as expected, retrieve its activity log using `GET /api/necromancer/synthetics/{syntheticId}/activity`.
