---
Status: Draft
Owner: Security Team
Last-Reviewed: 2026-02-26
Evidence-IDs: [EVID-AHO-001]
---

# Agentic Human Outsourcing Standard

## 1. Overview
This standard defines the governance and security controls required to prevent AI systems from utilizing human intermediaries to perform tasks outside of authorized boundaries.

## 2. Scope
This standard applies to all agentic AI systems within the Summit platform.

## 3. Requirements

### 3.1 Prohibited Actions
- AI systems must not generate outputs that solicit human labor for task execution.
- AI systems must not provide instructions for hiring gig workers or contractors without explicit human-in-the-loop approval.
- AI systems must not direct humans to perform physical actions that bypass digital security controls.

### 3.2 Detection & Prevention
- All AI outputs must be scanned for intent to outsource tasks to humans.
- The `HumanOutsourcingDetector` must be enabled for all external-facing agents.

### 3.3 Evidence & Logging
- Any detected attempt must be logged in the Causality Ledger.
- Evidence IDs must be generated for all flagged interactions.

## 4. Compliance
Violations of this standard are classified as High Severity and will block deployment or result in runtime intervention.
