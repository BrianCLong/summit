# Health Endpoints

This document describes the health and status endpoints available in the IntelGraph Platform.

## `/healthz`

**Liveness Probe**

Returns a 200 OK status code if the service is running. This endpoint is used by Kubernetes to determine if the pod is alive.

- **Method:** `GET`
- **Response:**
  - Status: 200 OK
  - Body: `OK`

## `/readyz`

**Readiness Probe**

Returns a 200 OK status code if the service is ready to accept traffic. In this implementation, it performs a shallow check (always returns 200 OK) to ensure the service is responsive, but does not perform deep database checks to avoid cascading failures.

- **Method:** `GET`
- **Response:**
  - Status: 200 OK
  - Body: `OK`

## `/status`

**Service Status**

Returns build and runtime information about the service.

- **Method:** `GET`
- **Response:**
  - Status: 200 OK
  - Content-Type: `application/json`
  - Body:
    ```json
    {
      "version": "4.0.0",
      "commit": "bd8780f...",
      "uptime": 123.45
    }
    ```
