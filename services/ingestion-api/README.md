# Ingestion API Service

This service provides an API for uploading data and creating ingestion jobs.

## Architecture

-   **Framework:** Express
-   **Dependencies:** BullMQ, Multer, Redis

## API

### POST /ingest

Uploads a file and creates an ingestion job.

**Request:** `multipart/form-data`
-   `file`: The data file to ingest.
-   `config`: A JSON string containing the mapping and policy configuration.

**Response:**
-   `jobId`: The ID of the created ingestion job.
