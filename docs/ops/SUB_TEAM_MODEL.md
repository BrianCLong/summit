# Summit Sub-Team Operating Model

## 1. Philosophy: Delegate and Empower

The purpose of this model is to scale execution by delegating ownership to autonomous sub-teams without diluting the rigor of the GA (General Availability) process. We empower teams to move with velocity within clear, defined boundaries, ensuring that accountability is explicit and auditable.

**Hard Constraints:**
- No central bottleneck teams.
- No weakening of GA, evidence, or drift-guard standards.
- No ambiguity in ownership or escalation.
- Delegation must be auditable and reversible.

## 2. Canonical Sub-Team Types

The Summit project is organized into six canonical sub-teams, each with a distinct charter and a clear set of owned surfaces and required artifacts.

| Team Name                         | Core Mission                                                                | Primary Interface / Output                             |
| --------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| **1. Product Engineering**        | Deliver end-user-facing features and own the product GA readiness.          | Product Evidence Index + Go/No-Go Attestation          |
| **2. Platform Engineering**       | Provide stable, scalable, and observable core services and infrastructure.  | Platform Evidence Index + Compatibility Contracts      |
| **3. Security & Trust**           | Enforce security gates, manage hardening, and ensure audit readiness.       | Security Evidence Section + Waiver Policy              |
| **4. Release & Operations**       | Own the merge train, GA cadence, and operational reporting.                 | Ops Summaries + Enforcement Ladder                     |
| **5. Growth & External Surfaces** | Manage all public-facing communication, including the website and docs.     | Public Claim Ledger + Drift Guard                      |
| **6. AI/ML Features**             | Develop and integrate AI- and ML-driven capabilities into the platform.     | AI/ML Model Evidence + Performance Baselines           |

## 3. Interfaces and Escalation

Each team operates independently within its defined charter. Cross-team dependencies and conflicts are managed through a deterministic [Escalation Protocol](./ESCALATION_PROTOCOL.md). The primary interfaces for each team are the evidence bundles and attestations they produce as part of the global GA process.
