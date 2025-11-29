# Runbook: SOC2 Evidence Generation System

**Owner:** Compliance & Engineering Teams
**Last Updated:** 2025-11-27
**Status:** Production

## 1. Overview

This document provides a comprehensive guide to the automated SOC2 evidence generation and management system for the IntelGraph platform. The system is designed to provide a high-assurance, auditable, and repeatable process for collecting and preserving compliance artifacts.

Its primary functions are:
- **Automated Monthly Generation:** A background job runs on the first of every month to generate, sign, and store the SOC2 evidence packet for the preceding month.
- **On-Demand Manual Generation:** A secure API endpoint allows authorized personnel to generate evidence packets for custom time periods.
- **Cryptographic Integrity:** All generated artifacts (both JSON and PDF) are digitally signed to ensure they are tamper-evident.
- **Secure Storage:** Artifacts are stored in a simulated WORM (Write-Once, Read-Many) storage location.

## 2. System Architecture

The system is composed of several key services that work in concert:

- **`SOC2ComplianceService`**: The core service that queries live data from various system repositories (e.g., `UserRepository`) to compile the evidence packet.
- **`BatchJobService` (`pg-boss`)**: Manages the scheduling and execution of the monthly background job. It ensures the job runs reliably and provides automatic retries on failure.
- **`SigningService`**: Handles the cryptographic signing of all generated artifacts using a private key managed by the system configuration. It also exposes a public key for signature verification.
- **`FileStorageService`**: Manages the storage of the final, signed artifacts in a secure, read-only location.
- **API Endpoint (`/api/compliance`)**: Provides a secure interface for manual evidence generation and public key retrieval.

## 3. Automated Generation

- **Job Name:** `generate-soc2-evidence`
- **Schedule:** Runs automatically on the first day of every month at 03:00 UTC.
- **Cron Expression:** `0 3 1 * *`
- **Action:**
    1.  Calculates the date range for the *previous* calendar month.
    2.  Generates the SOC2 evidence packet in both JSON and PDF formats.
    3.  Digitally signs both the JSON and PDF files, creating detached `.sig` files.
    4.  Stores all four artifacts (e.g., `SOC2_Evidence.json`, `SOC2_Evidence.json.sig`, `SOC2_Evidence.pdf`, `SOC2_Evidence.pdf.sig`) in the WORM storage.

## 4. Manual Generation (API)

Authorized users can manually trigger evidence generation via a secure REST endpoint.

- **Endpoint:** `GET /api/compliance/soc2-packet`
- **Authorization:** Requires an authenticated user with the `ADMIN` or `compliance-officer` role.
- **Query Parameters:**
    - `startDate` (required): The start date for the audit period in ISO 8601 format (e.g., `2025-01-01T00:00:00.000Z`).
    - `endDate` (required): The end date for the audit period in ISO 8601 format (e.g., `2025-12-31T23:59:59.999Z`).
    - `format` (optional): Set to `pdf` to receive the report as a PDF document. If omitted, defaults to JSON.

- **Example (cURL):**
  ```bash
  # Request JSON packet
  curl -X GET "http://localhost:4000/api/compliance/soc2-packet?startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z" \
       -H "Authorization: Bearer <JWT_TOKEN>"

  # Request PDF packet and save to file
  curl -X GET "http://localhost:4000/api/compliance/soc2-packet?startDate=...&endDate=...&format=pdf" \
       -H "Authorization: Bearer <JWT_TOKEN>" \
       --output evidence_packet.pdf
  ```

## 5. Signature Verification

Every generated artifact is accompanied by a base64-encoded digital signature, provided in the `X-Evidence-Signature` header for API responses or as a `.sig` file for automated jobs. This allows anyone to verify that the artifact has not been altered.

**Verification Steps:**

1.  **Retrieve the Public Key:**
    Fetch the PEM-formatted public key from the API.
    ```bash
    curl http://localhost:4000/api/compliance/public-key -o public_key.pem
    ```

2.  **Save the Artifact and Signature:**
    - Save the content of the evidence packet to a file (e.g., `evidence.json`).
    - Save the signature from the `X-Evidence-Signature` header or the `.sig` file to another file (e.g., `evidence.sig`). **Note:** The signature is base64-encoded, so it must be decoded before verification.

3.  **Verify using OpenSSL:**
    ```bash
    # For a JSON packet
    # First, decode the signature from base64
    base64 -d evidence.sig > evidence.sig.bin

    # Then, verify against the original file
    openssl dgst -sha256 -verify public_key.pem -signature evidence.sig.bin evidence.json

    # Expected output on success:
    # Verified OK
    ```

## 6. Observability

### Prometheus Metrics

- **`intelgraph_soc2_job_runs_total`**: A counter for the number of job runs.
  - `status="success"`: The job completed successfully.
  - `status="failure"`: The job failed.
- **`intelgraph_soc2_job_duration_seconds`**: A histogram measuring the duration of the job run in seconds.
- **`intelgraph_soc2_packet_size_bytes`**: A gauge indicating the size of the generated JSON packet in bytes.

### Prometheus Alert

- **Alert Name:** `SOC2EvidenceJobFailed`
- **Severity:** `critical`
- **Trigger:** Fires if the `intelgraph_soc2_job_runs_total{status="failure"}` counter increases over a 1-hour window.
- **Action:** Notifies the `#compliance` channel in Alertmanager.

## 7. Troubleshooting

- **Symptom:** The `SOC2EvidenceJobFailed` alert is firing.
  - **Investigation:**
    1. Check the server logs for errors prefixed with `[JOB: generate-soc2-evidence]`.
    2. Common causes include database connection issues, misconfiguration of the `SIGNING_PRIVATE_KEY`, or permissions errors when writing to the WORM storage directory.
    3. Manually trigger a run via the API to attempt to reproduce the error and get a more immediate feedback loop.

- **Symptom:** Signature verification fails.
  - **Investigation:**
    1. Ensure the public key is correctly downloaded.
    2. Double-check that the signature was properly base64-decoded before using `openssl`.
    3. Verify that the evidence file has not been altered in any way (e.g., by formatting or whitespace changes) after being downloaded.
