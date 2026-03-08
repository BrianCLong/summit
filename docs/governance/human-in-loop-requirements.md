# Human-in-the-Loop Requirements

This document outlines the mandatory requirements for human oversight when deploying AI models, specifically addressing high-risk contexts and conditional military access within the Summit platform.

## Overview

As part of Summit's policy enforcement and observability architecture, we require structured human-in-the-loop (HITL) enforcement for specific inference profiles and use cases. This ensures that algorithmic decisions with significant impact are reviewed, authorized, and logged by accountable personnel.

## Required Contexts

The following scenarios require explicit HITL implementation:

1.  **`defense_restricted` Profile Operations**: Any deployment utilizing the defense-restricted inference profile must incorporate a mandatory human review step before executing actions, especially in intelligence analysis, logistics planning, or cyber defense simulations.
2.  **High-Risk Decisions**: Any system where AI recommendations influence critical operations, safety, or compliance must have a designated human authority for final approval.
3.  **Override Actions**: Any authorized attempt to override tenant-level configurable controls must require multi-party human authentication and explicit documentation of rationale.

## Enforcement Mechanisms

1.  **Audit Trails**: Every HITL intervention (approval, denial, modification) is logged by the `auditEmitter` with the associated user ID, timestamp, and justification.
2.  **Policy Guard Middleware**: The API layer (`policyGuard.ts`) enforces the requirement that requests flagged for HITL review cannot proceed until explicitly authorized via a separate, authenticated endpoint.
3.  **Cryptographic Proof**: Audit logs provide verifiable evidence of human oversight, essential for regulatory compliance and enterprise RFPs.

## Implementation Guidelines

*   **Design for Reviewability**: Interfaces must present AI outputs clearly, including confidence scores, identified risks, and the underlying data sources, enabling effective human evaluation.
*   **Accountability**: The human operator must be definitively identifiable and held accountable for their authorizations.
*   **Continuous Monitoring**: HITL effectiveness must be periodically reviewed to ensure operators are not merely "rubber-stamping" AI decisions and that the process remains robust against adversarial use.
