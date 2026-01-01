# Claim Discipline Doctrine

**Status:** IMMUTABLE
**Authority:** DOCTRINE-ROOT
**Last Verified:** 2025-10-25

## Purpose
This document establishes **Claim Discipline** as a first-class system within Summit. A "claim" is not merely marketing copy or UI text; it is an **interface with reality** that requires rigorous verification.

---

## 1. The Nature of Claims

### 1.1 Claims are Liability
Every assertion the system makes (e.g., "Threat detected," "System secure," "Optimization complete") is a liability that must be serviced by evidence.

### 1.2 The Claim Lifecycle
A valid claim must pass through this lifecycle:
1.  **Proposition:** The raw assertion.
2.  **Evidence Binding:** Linking the assertion to specific data points (hashes, logs, metrics).
3.  **Verification:** Automated or human check that the evidence supports the proposition.
4.  **Publication:** The claim is presented to the user.
5.  **Expiration:** Claims decay over time. A claim verified at T=0 may be invalid at T+1hr.

---

## 2. Enforcement Mechanisms

### 2.1 The Evidence Requirement
No feature may present a status of "Green/Safe/Verified" without a cryptographic or logical proof linked to that state. "Trust me, bro" is not a valid architectural pattern.

### 2.2 Claim Expiration
All claims have a Time-to-Live (TTL).
*   **Real-time claims:** TTL < 1 minute (e.g., "Service Up")
*   **Audit claims:** TTL = Audit Cycle (e.g., "Compliant with SOC2")
*   **Static claims:** Must be re-verified on any code change (e.g., "Encryption enabled")

### 2.3 Explicit Non-Claims
The system must explicitly state what it is *not* claiming when necessary to prevent user over-reliance.
*   *Example:* "No anomalies detected (Scope: Last 24h, HTTP traffic only)." vs "System is clean."

---

## 3. Forbidden Patterns

### 3.1 The "Magic" Anti-Pattern
Interfaces that obscure the mechanism of action to appear "magical" are forbidden if that obscurity hides the reliability limits.

### 3.2 False Precision
Displaying data with more precision than the measurement tool supports (e.g., "Risk Score: 87.492%" when the underlying heuristic is rough) is a violation of claim discipline.

### 3.3 Silent Degradation
If the evidence backing a claim becomes unavailable (e.g., telemetry loss), the claim must immediately revert to "Unknown," not persist the last known good state.

---

## 4. Operationalization

*   **Engineering:** Build verification logic *before* UI presentation logic.
*   **Product:** Define the "Evidence Bill of Materials" for every new feature.
*   **Sales/Marketing:** Strictly adhere to the "Verified Claims List" derived from system capabilities.
