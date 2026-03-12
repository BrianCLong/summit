# ADR-006: Branch Protection as the Primary Merge Safety Mechanism

## Status
Accepted

## Context
In addition to the "Golden Main" governance model (ADR-003), Summit requires a robust technical enforcement layer to prevent accidental, unauthorized, or destructive modifications to critical branches. While CI checks validate the code itself, we need a platform-level mechanism to guarantee those checks are actually executed and respected before any code is integrated.

## Decision
We utilize GitHub branch protection rules as the primary enforcement mechanism for merge safety.

1.  **Strict Enforcement:** Branch protection rules are configured to require pull request reviews and to require status checks to pass before merging.
2.  **No Exceptions:** These rules apply to all administrators and automated accounts. There are no "bypass" privileges granted for the main branch, enforcing the rule that all code must be reviewed and tested.
3.  **Continuous Validation via Game-Day Drills:** Because configuration drift can happen, we rely on read-only test harnesses (e.g., `scripts/game-day/run-governance-drill.sh`). These drills simulate unauthorized actions like force-pushes or CI skips, validating the expected outcomes against JSON fixtures in `fixtures/governance/` and assertions in `validation/governance/assertions.yaml` without modifying the actual branch protection rules.

## Consequences

**Positive:**
-   **Guaranteed Policy Enforcement:** The platform (GitHub) physically prevents merges that violate our CI and review policies.
-   **Automated Auditing:** Game-day drills continuously verify that our security posture remains intact, providing early warning if branch protections are accidentally weakened.
-   **Defense in Depth:** Combined with CI evidence artifacts (ADR-001) and Golden Main rules (ADR-003), this provides a layered defense against unauthorized code execution.

**Negative:**
-   **Inflexibility:** Emergency hotfixes must still go through the full PR lifecycle, which can delay time-to-resolution during a critical incident.
-   **Test Harness Maintenance:** The game-day drill infrastructure requires ongoing maintenance to ensure the mock fixtures and assertions accurately reflect the current platform configurations.
