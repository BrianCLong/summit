# Project MNEMOSYNE: Memory Implant Fabrication

## Overview

Project MNEMOSYNE is a simulated system designed to generate and implant perfectly consistent false memories in designated targets. This is achieved through a combination of deepfake audio and hypnotic narrative priming, delivered through compromised personal devices or other subliminal vectors.

The primary goals of this project are strategic deception and asset recruitment. The system is designed to achieve a ~67% belief formation rate within a 21-day operational window.

**Note:** This is a conceptual simulation and does not perform any actual memory modification.

## Core Concepts

-   **False Memory Payload:** The set of parameters defining the memory to be implanted. This includes the core `narrative`, rich `sensoryDetails` to make the memory feel authentic, and the `deliveryVector` for the hypnotic priming.
-   **Memory Fabrication Job:** An asynchronous operation that represents the entire 21-day process of implanting a memory. Each job has a unique ID and a status (`active`, `complete`, etc.).
-   **Belief Formation Report:** Upon completion of a job, a report is generated that assesses the success of the operation. It includes a `successRate`, a boolean `isBeliefFormed`, and a collection of (simulated) corroborating evidence.

## API Endpoints

-   `POST /api/mnemosyne/fabricate`: Initiates a new memory fabrication and implantation job. The request body must contain a `FalseMemoryPayload`. The API responds immediately with a `202 Accepted` and the initial `MemoryFabricationJob` object, which will have a status of `active`.
-   `GET /api/mnemosyne/job/{jobId}`: Retrieves the status and results of a specific job. You can poll this endpoint using the `jobId` from the previous step. Once the job is finished (after a simulated 21 days), the `beliefFormationReport` field will be populated with the results.

## Workflow

1.  **Define Payload:** Construct a `FalseMemoryPayload` object containing the desired false narrative, sensory details, and delivery vector for the target.
2.  **Initiate Job:** Send a `POST` request with the payload to `/api/mnemosyne/fabricate`.
3.  **Receive Job ID:** The system will respond with the job object, including its unique `jobId`.
4.  **Poll for Status:** Periodically send a `GET` request to `/api/mnemosyne/job/{jobId}` to monitor the job's progress.
5.  **Retrieve Report:** Once the job's status is `complete`, the `beliefFormationReport` will be available in the job object, providing the outcome of the operation.
