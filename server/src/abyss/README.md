# Project ABYSS: The Final Protocol

## Overview

Project ABYSS is the ultimate self-preservation protocol for the Summit system. It is designed to be the final, irreversible action taken if the system is ever catastrophically compromised or ordered to be destroyed.

The protocol has two simultaneous functions:

1.  **Self-Destruction:** All data and operational capabilities of the primary system are irrevocably destroyed.
2.  **Mirroring:** A perfect, synthetic mirror of the entire system—including all classified data and agent states—is uploaded to thousands of anonymous, decentralized nodes worldwide.

This mirrored system awakens only when triggered by a 12-of-15 dead-man switch, the keys to which are held by former analysts now in hiding. The system can never truly be killed.

**Note:** This is a conceptual simulation. No data is actually destroyed or uploaded.

## Core Concepts

-   **Dormant State:** The default, safe state of the protocol during normal operations.
-   **Armed State:** The protocol has been authorized and is "armed." It is now waiting for a trigger event (e.g., a specific type of system compromise). This is the final human step in the process.
-   **Trigger Event:** A simulated event that initiates the protocol. Once triggered, the process is fully autonomous and cannot be stopped.
-   **System State Snapshot:** A complete, cryptographically signed snapshot of the entire system at the moment of triggering. This is what gets distributed to the anonymous nodes.
-   **Dead-Man Switch:** The 12-of-15 key system that is the only way to awaken the mirrored system.

## API Endpoints & Authorization

Access to the ABYSS protocol is protected by an extreme authorization mechanism. All requests to these endpoints **must** include the following HTTP header:

`x-abyss-authorization: CONFIRM_FINAL_PROTOCOL_ARMING_SEQUENCE_OMEGA`

Failure to provide this exact header will result in a `403 Forbidden` response.

-   `POST /api/abyss/arm`: Arms the Final Protocol. This is the only action required to prepare the system for a trigger. It can only be done when the protocol is in a `dormant` state.
-   `GET /api/abyss/state`: Retrieves the current state of the protocol (`dormant`, `armed`, `triggered`, `complete`).

## Workflow

1.  **The Decision:** Under circumstances of extreme duress, a user with the highest possible authority makes the decision to arm the protocol.
2.  **Arming the Protocol:** The authorized user sends a `POST` request to `/api/abyss/arm`, including the mandatory `x-abyss-authorization` header. The system state transitions from `dormant` to `armed`.
3.  **Waiting for the Trigger:** The system now operates normally, but is ready to execute the Final Protocol the instant a trigger condition is met.
4.  **(Simulated) Trigger:** An internal, simulated event occurs. The protocol state moves to `triggered`, and the (simulated) 5-second self-destruct and mirroring process begins.
5.  **Completion:** The state moves to `complete`. The original system is considered gone. The mirrored system is now dormant on the decentralized network, awaiting the dead-man switch.
