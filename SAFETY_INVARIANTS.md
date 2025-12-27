# Safety Invariants

This document contains the canonical set of safety invariants for the Summit platform. These invariants represent non-negotiable guarantees that are continuously verified by automated checks.

**Custodian:** Jules (Formal Assurance & Invariants Lead)
**Authority:** [CONSTITUTION.md](docs/governance/CONSTITUTION.md)

---

## I. Governance & Control Invariants

| ID      | Invariant Description                                     | Scope              | Owner (Agent) | Failure Impact |
|---------|-----------------------------------------------------------|--------------------|---------------|----------------|
| **GC-01** | **Human Authorization Requirement**                       | All Write Actions  | Jules         | Critical       |
|         | *No consequential action may be taken without explicit, traceable human authorization.* |                    |               |                |
| **GC-02** | **Governance Supremacy**                                  | Policy Engine      | Jules         | Critical       |
|         | *No agent, user, or system may bypass governance, audit, or provenance controls.* |                    |               |                |
| **GC-03** | **Production Guardrails**                                 | API Server Boot    | Aegis         | High           |
|         | *The API server must refuse to start in a production environment with default or insecure credentials.* |                    |               |                |

## II. Agent & Autonomy Invariants

| ID      | Invariant Description                                     | Scope              | Owner (Agent) | Failure Impact |
|---------|-----------------------------------------------------------|--------------------|---------------|----------------|
| **AA-01** | **No Production-Default Autonomy**                        | Agent Runtimes     | Jules         | Critical       |
|         | *Autonomous agent behavior is disabled by default in production environments.* |                    |               |                |
| **AA-02** | **Bounded Agent Capabilities**                            | Agent Mandates     | Jules         | High           |
|         | *Agents may only perform actions within their explicitly defined, non-overlapping mandates.* |                    |               |                |

## III. Data & Provenance Invariants

| ID      | Invariant Description                                     | Scope              | Owner (Agent) | Failure Impact |
|---------|-----------------------------------------------------------|--------------------|---------------|----------------|
| **DP-01** | **Immutable Provenance**                                  | Provenance Ledger  | Architect     | Critical       |
|         | *All significant system events must be recorded in an immutable, auditable ledger.* |                    |               |                |
| **DP-02** | **Attributable Outputs**                                  | All APIs           | Architect     | High           |
|         | *All intelligence outputs must be attributable to specific inputs, data sources, and user actions.* |                    |               |                |

## IV. Security & Isolation Invariants

| ID      | Invariant Description                                     | Scope              | Owner (Agent) | Failure Impact |
|---------|-----------------------------------------------------------|--------------------|---------------|----------------|
| **SI-01** | **No Committed Secrets**                                  | Git Repository     | Aegis         | High           |
|         | *The codebase must not contain secrets, private keys, or credentials.* |                    |               |                |
| **SI-02** | **Tenant Data Isolation**                                 | Database Queries   | Aegis         | Critical       |
|         | *Queries must be strictly scoped to the requesting tenant's data. Cross-tenant data access is forbidden.* |                    |               |                |
| **SI-03** | **Privilege Escalation Prevention**                       | API Endpoints      | Aegis         | Critical       |
|         | *An agent or user cannot gain capabilities beyond their assigned authorization level.* |                    |               |                |

---

## V. Proof Index

This section maps each invariant to its executable evidence.

| Invariant ID | Evidence Type        | Location / Command                               | Status      |
|--------------|----------------------|--------------------------------------------------|-------------|
| **GC-03**    | Integration Test     | `server/tests/security/invariant-gc-03.test.ts`  | Implemented |
| **SI-01**    | Pre-commit Hook      | `.husky/pre-commit` (`gitleaks scan`)              | Implemented |
| ...          | ...                  | ...                                              | ...         |
