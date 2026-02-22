# Dual-Use Policy: Summit Influence Operations

## Overview
This policy strictly prohibits the use of Summit features for the generation or optimization of malicious influence campaigns. All features are designed and intended for **defensive** and **analytic** purposes only.

## Core Directives

### 1. No Adversarial Optimization
-   Features must not provide recommendations or automated actions that enhance the effectiveness of adversarial tactics (e.g., maximizing polarization, inciting violence, eroding trust).
-   Simulation tools (e.g., Wargames) are for **red-teaming** and **resilience planning** only.

### 2. Defensive Intent
-   All capabilities (Narrative Market, Cognitive State Graph, Proof Layer) must be used to:
    -   Understand and map influence dynamics.
    -   Identify vulnerabilities in information ecosystems.
    -   Develop defensive strategies (inoculation, debunking, counter-narratives).
    -   Assess the impact of potential interventions.

### 3. Attribution and Harm
-   Attribution of actors or campaigns requires calibrated confidence levels.
-   Outputs that could cause harm (e.g., doxxing, reputational damage) must be gated by human review and approval workflows.
-   Automated actions based on attribution are prohibited without explicit authorization.

### 4. Synthetic Media
-   The creation or dissemination of synthetic media (deepfakes, manipulated content) for deceptive purposes is strictly prohibited.
-   Detection and tracking of synthetic media is permitted for defensive analysis.

## Enforcement
-   Violations of this policy will result in immediate access revocation and potential legal action.
-   Automated checks (CI/CD gates) enforce these constraints where possible (e.g., preventing the deployment of optimization algorithms for harmful metrics).
