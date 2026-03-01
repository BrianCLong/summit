# Summit Sovereign Deployment Kit (SDKIT)

This directory contains the documentation and utilities for deploying Summit in air-gapped, sovereign, and restricted environments.

## Deployment Profiles

Summit supports three sovereign deployment profiles:

1. **`sovereign-airgap`**: Fully disconnected. No internet egress. All dependencies must be pre-loaded. Uses offline signing keys.
2. **`sovereign-privatecloud`**: Deployed in a private cloud VPC. May have internal network connectivity but strict egress controls.
3. **`sovereign-restricted-egress`**: Sovereign region deployment with tightly controlled egress to specific whitelisted endpoints only.

## Quickstarts

* [Air-Gapped Quickstart](./airgap-quickstart.md)
* [Private Cloud Quickstart](./privatecloud-quickstart.md)
* [Restricted Egress Quickstart](./restricted-egress-quickstart.md)

## Architecture & Security

* [Architecture Diagram](./architecture.md)
* [Threat Model Summary](./threat-model.md)
* [Verification & Acceptance Tests](./verification.md)
* [Secrets & Cryptography Strategy](./crypto.md)
