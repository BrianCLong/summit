# Velocity Lanes Standard

## 1. Overview
Velocity Lanes provide a mechanism to decouple "safe" changes from "risky" changes, allowing parallel execution streams that do not block each other. Each lane has a specific CI profile, review requirement, and merge speed.

## 2. The Lanes

### 🏎️ Fast Lane
**Purpose:** Rapid merging of low-risk changes.
**Allowed Change Classes:** `Patch`
**Requirements:**
- **Checks:** Lint, Unit Tests, Docs Build.
- **Review:** 1 Approver (can be automated for specific paths like `docs/*`).
- **Target Merge Time:** < 4 hours.
**Exclusions:**
- No backend code changes.
- No schema changes.

### 🚗 Standard Lane
**Purpose:** The default lane for routine feature work.
**Allowed Change Classes:** `Minor`
**Requirements:**
- **Checks:** Full Test Suite (Unit + Integration), E2E Smoke Tests, Schema Diff.
- **Review:** 1 Code Owner + 1 Peer.
- **Target Merge Time:** < 24 hours.

### 🛡️ Guarded Lane
**Purpose:** Careful orchestration of high-risk or breaking changes.
**Allowed Change Classes:** `Breaking`
**Requirements:**
- **Checks:** Full Test Suite, Extended E2E, Load Tests, Canary Deployment, Security Scan.
- **Review:** 2 Code Owners + Security Review.
- **Merge Window:** Restricted (e.g., no Friday deployments).

## 3. Lane Mapping & Enforcement

| Lane | Trigger | CI Depth | Reviewers |
| :--- | :--- | :--- | :--- |
| **Fast Lane** | `Patch` | ⚡ Light (Lint/Unit) | 1 |
| **Standard** | `Minor` | 🟡 Standard (Full) | 2 |
| **Guarded** | `Breaking` | 🔴 Heavy (Full + Load + Canary) | 2 + Security |

## 4. Downgrade & Escalation
- **Escalation:** If a Fast Lane PR fails tests or is flagged by a reviewer, it is automatically moved to Standard Lane.
- **Downgrade:** A Standard Lane PR found to be purely cosmetic can be moved to Fast Lane to unblock merging.

## 5. Automation
CI pipelines automatically detect the declared lane and skip unnecessary jobs for Fast Lane, while enforcing strict gates for Guarded Lane.
