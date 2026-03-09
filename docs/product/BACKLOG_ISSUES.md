# Backlog Issues (Epics/Stories)

## Epic 1: Evidence Integrity Gate
*   **Story**: Implement content-addressed evidence storage using MinIO/S3.
*   **Story**: Implement `ed25519` cryptographic signing for evidence bundles.
*   **Story**: Create CI gate to enforce determinism on pipeline runs.

## Epic 2: Sandboxed Module Runtime
*   **Story**: Set up gVisor/container runtime.
*   **Story**: Enforce network policies restricting egress to the Capture Proxy.
*   **Story**: Implement the first 10 core modules in the SDK.

## Epic 3: Capture Proxy
*   **Story**: Create an HTTP/DNS proxy that records all traffic.
*   **Story**: Enforce policy allowlists per tenant.
*   **Story**: Implement "offline replay mode" from captured artifacts.
