# Roadmap: Trust Category Proof-of-Concept

To achieve material parity and win in the Trust Category, Summit focuses on these four pillars over the next 1-2 sprints.

## 1. Golden 5 Connectors

Build and harden the core connectors with advanced reliability and audit capabilities.

- **Target Connectors**: Okta/AAD, GitHub, Jira, Google Drive/Confluence, AWS.
- **Requirements**:
  - **Replay/DLQ**: High-assurance delivery for all events.
  - **Ingest Receipts**: Every ingested item gets a signed provenance receipt at the door.
  - **Least Privilege**: Defaulting to minimal scopes required for operation.

## 2. Runs UI (v1)

Move beyond debug logs to a first-class operational surface for workflow introspection.

- **Features**:
  - **Execution Timeline**: Visual history of every step in a workflow.
  - **Retry Management**: Inline visibility and controls for retries.
  - **Policy Traces**: Show exactly which policies were checked and why they passed/failed for each step.
  - **Embedded Receipts**: View signed receipts directly in the run context.

## 3. Action Catalog (v1)

A governed portal for executing sensitive actions with built-in guardrails.

- **Features**:
  - **Approval Gating**: Configurable human-in-the-loop for high-risk tools.
  - **ABAC Preflight**: Simulation of "Would allow/deny" based on current user context before action execution.
  - **TTL Controls**: Temporary access/permissions for specific actions.
  - **Run Receipts**: Every action execution generates an exportable, signed proof.

## 4. Evidence Bundle Export (v1)

Automate the manual toil of audit evidence collection.

- **Features**:
  - **Bundle Manifest**: A machine-readable (JSON) index of all evidence in a package.
  - **Signed Receipts**: Collection of individual provenance receipts from actions and workflows.
  - **One-Click Export**: Generate a ZIP/S3 bundle ready for auditor review.
  - **Tamper-Evident Index**: Cryptographic proof that the bundle hasn't been modified since generation.
