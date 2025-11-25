# Project AURORA: Live Neural Lace Integration

## Overview

Project AURORA provides a simulated API for direct brain-computer interface (BCI) interactions within the Summit platform. It models the functionality of technologies like Neuralink, Paradromics, and Synchron to enable real-time thought-to-entity creation and bidirectional data flow between an analyst's brain and the system.

This module is a speculative implementation and does not connect to any real BCI hardware.

## Core Concepts

- **Neural Implant:** A digital representation of a BCI device implanted in an analyst. Each implant has a unique ID, type, and status.
- **Thought-to-Entity:** The primary function of AURORA. An analyst can formulate a thought about an entity (e.g., a person, place, or object), and the BCI translates this neural signal into a structured data object that can be created within the IntelGraph.
- **Cortex Overlay:** The reverse data flow, where the system can push information directly into the analyst's visual cortex. This can be used for alerts, displaying images, highlighting graph nodes, or showing geospatial tracks without a physical screen.
- **Secure Handshake:** All communications with an implant begin with a secure handshake process to ensure the device is online, authenticated, and ready for data transmission.

## API Endpoints

- `GET /api/aurora/implants`: Retrieves the status of all known neural implants.
- `POST /api/aurora/handshake/{implantId}`: Initiates a connection with a specific implant to bring it online.
- `POST /api/aurora/cortex-overlay`: Pushes a data overlay (e.g., text, image URL) to a specified implant for direct-to-cortex visualization.

## Data Structures

Key data structures are defined in `aurora.types.ts`:
- `NeuralImplant`: Represents the BCI device.
- `ThoughtPacket`: A single, translated thought from an analyst.
- `CortexOverlay`: Information to be pushed to the analyst's visual cortex.

## Usage

1. **Check Implant Status:** First, retrieve the list of available implants to find a target `implantId`.
2. **Initiate Handshake:** Perform a POST request to the handshake endpoint with the desired `implantId` to bring it online.
3. **Push Overlay:** Send data to the analyst's cortex by POSTing a `CortexOverlay` object to the `/cortex-overlay` endpoint.
