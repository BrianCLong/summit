# Runbook: CI Token Leak Tabletop Exercise

## Overview
**Objective:** Simulate a CI token leak scenario to validate detection, containment, and recovery procedures.
**Duration:** 60 minutes
**Participants:** Security, DevOps/SRE, On-call Leads

## Scenario
A static analysis tool (e.g., secret scanner) detects a valid AWS access key committed to a public or internal repository in the `.github/workflows` directory.

## Phases

### 1. Trigger (0-5 mins)
*   **Inject:** Facilitator announces "Secret scanner alert: AWS Access Key ID AKIA... found in PR #123 diff."
*   **Discussion:**
    *   Who receives the alert?
    *   What is the SLA for acknowledgement?
    *   How do we verify if the key is active?

### 2. Containment (5-20 mins)
*   **Action:**
    *   Revoke the compromised credential immediately.
    *   Identify which systems/pipelines use this credential.
    *   Temporarily disable the affected pipeline to prevent failure loops?
*   **Discussion:**
    *   Do we have a "kill switch" for specific CI credentials?
    *   How do we assess the blast radius (what did the key have access to)?

### 3. Eradication (20-40 mins)
*   **Action:**
    *   Rotate the secret in the secrets manager (e.g., GitHub Secrets, Vault).
    *   Patch the code to remove the hardcoded secret (rewrite git history if public).
    *   Update the CI workflow to use the new secret or OIDC.
*   **Discussion:**
    *   How do we scrub the commit history?
    *   Is OIDC a viable replacement to prevent recurrence?

### 4. Recovery & Review (40-60 mins)
*   **Action:**
    *   Re-enable pipelines.
    *   Verify successful builds.
    *   Conduct a blameless post-mortem.
*   **Discussion:**
    *   What gaps were identified in the response?
    *   How can we automate the revocation process?

## Outcome
*   List of identified gaps.
*   Action items for tooling improvements (e.g., auto-revocation).
*   Updated runbooks.
