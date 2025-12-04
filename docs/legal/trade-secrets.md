# Trade Secret Protection Strategy

## Overview
Not all innovations should be patented. Patents require public disclosure. Trade Secrets protect proprietary logic that is hard to reverse-engineer (e.g., backend algorithms, weighting parameters, training data).

## Identified Trade Secrets

### 1. The "Maestro" Auction Weighting Parameters
*   **Description**: The specific coefficients used to weigh cost vs. speed vs. accuracy in the agent task auction.
*   **Why Trade Secret?**: Hard to detect infringement; disclosing it gives competitors our "recipe" for efficiency.
*   **Protection**:
    *   Code is in private repo (`server/src/maestro`).
    *   Config values should be injected via env vars/Secrets Manager, not hardcoded.
    *   Access restricted to Core Engineering.

### 2. Defensive PsyOps Heuristics
*   **Description**: The specific patterns and thresholds used to detect "Coordinated Inauthentic Behavior."
*   **Why Trade Secret?**: If published, adversaries (botnet operators) would optimize against them (Goodhart's Law).
*   **Protection**:
    *   Obfuscated in build artifacts.
    *   Logic resides on server-side only; never sent to client.

### 3. Prompt Engineering "Golden Prompts"
*   **Description**: The highly tuned system prompts for the "Analyst Agent" and "Verifier Agent."
*   **Why Trade Secret?**: Prompts are easily copied but hard to protect via patent. They represent hundreds of hours of tuning.
*   **Protection**:
    *   Stored in `prompts/` directory.
    *   Never exposed in API responses (output filtering).
    *   "Prompt Injection" defenses active to prevent leakage.

## Protection Protocols
1.  **Access Control**: Least-privilege access to the `server/src/services/` and `prompts/` directories.
2.  **NDAs**: All employees and contractors must sign IP Assignment and NDA agreements referencing these specific categories.
3.  **Clean Room**: If working with open-source contributors, core trade secret logic must be kept in a separate package (`packages/core-proprietary`) that is not open-sourced.
4.  **Audit Logs**: Monitor access to the "Golden Prompts" and key algorithm files.
