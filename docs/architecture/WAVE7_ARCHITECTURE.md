# Wave 7 Orchestrator Architecture Updates

## Overview
The Wave 7 Orchestrator introduces enhanced stability and operability for the Maestro agent swarm, integrating tightly with Switchboard and Koshchei subsystems.

## Key Components
- **Maestro (`server/src/maestro`):** Core agent runtime orchestrator. Uses in-memory states and persistent snapshotting.
- **IntelGraph (`server/src/graph`):** Knowledge graph integration for context.
- **Switchboard (`apps/switchboard-web`):** Human-in-the-loop review interface.

## Recent Changes
- Deprecated legacy local queues in favor of BullMQ.
- Consolidated observability metrics into `server/src/observability/metrics.ts`.
- Removed stale references to legacy V1 pipelines.
