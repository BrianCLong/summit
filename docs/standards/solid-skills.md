# Summit Engineering Standard: SOLID + TDD (inspired by ramziddin/solid-skills)

## Overview
This standard adopts the core engineering principles from the [ramziddin/solid-skills](https://github.com/ramziddin/solid-skills) agent skill, adapting them for Summit's repository as both a human-readable guideline and a machine-verifiable guardrail ("Solid Gate").

## Non-negotiables (The "Spirit" of the Skill)

### 1. TDD (Test-Driven Development)
- **Rule:** Behavioral changes must be accompanied by tests.
- **Process:** Red → Green → Refactor.
- **Verification:** The Solid Gate checks `TESTS_NOT_TOUCHED` when source code is modified.

### 2. SOLID Principles
- **SRP (Single Responsibility Principle):** Classes/Modules should have one reason to change.
- **OCP (Open/Closed Principle):** Open for extension, closed for modification.
- **LSP (Liskov Substitution Principle):** Subtypes must be substitutable for their base types.
- **ISP (Interface Segregation Principle):** Clients should not be forced to depend on interfaces they do not use.
- **DIP (Dependency Inversion Principle):** Depend on abstractions, not concretions.

### 3. Clean Code & Security
- **Primitive Obsession:** Wrap primitives (IDs, emails) in value objects/domain types where appropriate.
- **Security Footnote:**
    - Avoid `key in obj` for untrusted keys in JS/TS to prevent prototype pollution or unexpected behavior.
    - **Preferred:** `Object.hasOwn(obj, key)` or `Map`.

## The "Solid Gate" (CI Guardrail)

Summit employs a diff-scoped tool called **Solid Gate** that runs on Pull Requests.

### Outputs (Evidence)
The tool produces deterministic artifacts in `artifacts/solid-gate/`:
- `report.json`: List of findings (rule violations or warnings) with stable IDs.
- `metrics.json`: Counts of findings by severity.
- `stamp.json`: Cryptographic proof of the run (config hash + commit SHA).

### Rules
| ID | Severity | Description |
|----|----------|-------------|
| `SOLID_GATE:TESTS_NOT_TOUCHED` | Warn | Source code was modified but no test files were touched. |
| `SOLID_GATE:PROTO_POLLUTION_RISK` | Warn | Use of `in` operator for membership check detected (JS/TS). |
| `SOLID_GATE:SMELL_LONG_FUNCTION` | Info | Function exceeds line count threshold (diff-scoped). |

### Enforcement
- **Default:** Report-only (non-blocking).
- **Drift Detection:** Weekly jobs track the trend of these violations.
