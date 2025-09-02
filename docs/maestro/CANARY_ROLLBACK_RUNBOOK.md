# Maestro Canary & Rollback Automation Runbook

## Overview

This runbook details the automated canary deployment and one-click rollback procedures for the Maestro platform. These processes ensure safe and reliable deployments by gradually exposing new versions to traffic and providing immediate recovery mechanisms.

## Canary Deployment Strategy

Maestro utilizes a canary deployment strategy to minimize risk during new feature rollouts and service updates.

- **Traffic Shifting:** Traffic is gradually shifted to the new version (canary) based on predefined percentages (e.g., 1%, 5%, 10%, 100%).
- **Automated Analysis:** During each phase of the canary, automated analysis is performed using Service Level Objectives (SLOs) as gates.
- **SLO Gates (Argo Analysis Templates - Conceptual):**
  - **Latency:** New version's p95 latency must not exceed baseline by more than X%.
  - **Error Rate:** New version's error rate must not exceed baseline by more than Y%.
  - **Cost:** New version's cost per transaction must not exceed baseline by more than Z%.
  - **Custom Metrics:** Integration with application-specific metrics (e.g., successful workflow completions).

- **Auto-Promotion/Abort:**
  - If all SLO gates pass, the new version is automatically promoted to the next traffic phase or full rollout.
  - If any SLO gate fails, the rollout is automatically aborted, and a rollback is initiated.

## One-Click Rollback Procedure

In the event of an issue detected during canary analysis or post-deployment, a one-click rollback mechanism is available to immediately revert to the last known good version.

### Triggering Rollback

Rollbacks can be triggered:

1.  **Automatically:** By failing SLO gates during canary analysis.
2.  **Manually:** Via the Maestro UI or CLI for immediate remediation.

### Manual Rollback Steps (Conceptual)

1.  **Identify Affected Service/Route:** Determine which service or routing rule needs to be rolled back.
2.  **Access Maestro UI/CLI:** Navigate to the relevant deployment or routing management section.
3.  **Initiate Rollback:**
    - **Maestro UI:** Locate the "Rollback" button for the specific service/route.
    - **Maestro CLI:** Execute `maestro rollback --service <service-name> --reason "Detected issue X"`
4.  **Verify Rollback:** Confirm that traffic has reverted to the previous stable version and the issue is mitigated.

### Rollback Mechanism (Conceptual)

The rollback mechanism leverages Maestro's routing pin history. When a rollback is triggered, the system reverts the routing pin for the affected service/route to its previous stable configuration.

- **Backend Endpoint:** `POST /api/maestro/v1/routing/rollback` (as implemented in the stub)
  - Payload: `{ route: string, reason: string }`
  - Action: Reverts the routing pin for the specified route to the `prevModel` from the pin history.

## Game Day Testing

Regular "Game Day" exercises are conducted to simulate real-world failure scenarios and test the effectiveness of canary and rollback automation.

(Game day scenarios, results, and lessons learned are maintained in a separate system.)

## Related Documentation

- **Maestro Routing Studio:** [Link to Routing Studio UI]
- **Maestro AlertCenter:** [Link to AlertCenter UI]
- **Maestro SLO Documentation:** [Link to SLO Documentation]
