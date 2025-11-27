# Ingest Wizard Security Analysis

This document outlines the security analysis for the Ingest Wizard feature.

## Threat Model

| Threat | Mitigation |
|---|---|
| Malicious File Upload | - Files are uploaded to a temporary, isolated staging area. <br> - Files are scanned for malware (not yet implemented). <br> - The ETL worker only processes files as data, not as executables. |
| Denial of Service (DoS) | - The ingestion API has rate limiting (not yet implemented). <br> - The file size is limited by the multer configuration. |
| Insecure Direct Object Reference (IDOR) | - The job ID is a UUID, making it difficult to guess. <br> - Access to job status is protected by the WebSocket API's authentication. |
| Cross-Site Scripting (XSS) | - All user-provided data is treated as text and is not rendered as HTML in the preview. |

## Hardening

-   [ ] Implement malware scanning for uploaded files.
-   [ ] Implement rate limiting on the ingestion API.
-   [ ] Add more robust validation for the `config` payload.

## Scaling Plan

-   **Ingestion API:** The API is stateless and can be scaled horizontally by adding more instances behind a load balancer.
-   **ETL Assistant:** The ETL worker is stateless and can be scaled horizontally by adding more worker instances. The number of workers can be auto-scaled based on the size of the `ingestion-queue`.
-   **Redis:** Redis can be scaled using a clustered configuration.
