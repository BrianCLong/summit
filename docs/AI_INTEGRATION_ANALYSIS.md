# AI/ML Integration Analysis: Summit

## Overview
The Summit repository implements a modular AI extraction pipeline designed to process multimodal data (Images, Video, Audio, Text) and integrate the results into the IntelGraph system.

## Key Components

### 1. Object Detection (YOLOv8)
*   **Core Script:** `server/src/ai/models/yolo_detection.py`
    *   **Description:** A standalone Python script utilizing the `ultralytics` library.
    *   **Capabilities:** Supports standard YOLOv8 models (`n`, `s`, `m`, `l`, `x`), custom class filtering, and JSON output formatting.
    *   **Usage:** Can be run via CLI for testing or invoked programmatically.

*   **Engine Wrapper:** `server/src/ai/engines/ObjectDetectionEngine.ts`
    *   **Role:** Node.js wrapper that manages the Python child process.
    *   **Features:** Handles configuration (models path, GPU enablement), parses output into typed `DetectionResult` objects, and includes stubs for object tracking and feature extraction.

### 2. Orchestration
*   **Service:** `server/src/services/ExtractionJobService.ts`
    *   **Role:** Manages the lifecycle of extraction jobs.
    *   **Workflow:**
        1.  Accepts a job request (Investigation ID, Media Source).
        2.  Enqueues a job in Redis via `bullmq`.
        3.  Worker processes the job by instantiating the appropriate Engine (e.g., `ObjectDetectionEngine`).
        4.  Results are normalized and stored in PostgreSQL (`multimodal_entities` table).
    *   **Scaling:** Supports concurrent processing with exponential backoff for retries.

### 3. Other AI Engines (Identified)
*   **OCR:** `OCREngine` (likely Tesseract wrapper).
*   **Speech-to-Text:** `SpeechToTextEngine` (Whisper wrapper).
*   **Face Detection:** `FaceDetectionEngine` (MTCNN wrapper).
*   **Text Analysis:** `TextAnalysisEngine` (NER/Sentiment).

## Example Workflow: Image to Graph

To process an intel image and generate graph nodes, the system follows this path:

1.  **Ingest:** Image file is uploaded/registered as a `MediaSource`.
2.  **Dispatch:** `ExtractionJobService.startExtractionJob()` is called with `extractionMethods: ['object_detection']`.
3.  **Detect:**
    *   `ObjectDetectionEngine` spawns `yolo_detection.py`.
    *   YOLO processes the image and returns bounding boxes + classes (e.g., "tank", "soldier").
4.  **Persist (Relational):**
    *   Entities are saved to `multimodal_entities` table.
5.  **Graph Sync (Conceptual):**
    *   A separate process (e.g., `IntelGraphService`) reads new entities.
    *   Converts them to graph nodes:
        ```cypher
        MERGE (i:Image {id: '...'})
        CREATE (o:Object:Tank {confidence: 0.95})
        CREATE (i)-[:DEPICTS]->(o)
        ```

## Running the Example
A standalone script has been created to simulate this workflow:

```bash
# Ensure dependencies are installed (ultralytics, opencv-python)
python3 scripts/example_yolo_workflow.py --image <path_to_image>
```
