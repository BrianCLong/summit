# Module Boundaries: companyOS Governance Layer

## Overview
This document defines the hard boundaries between companyOS and the Summit ecosystem (Summit core, IntelGraph, Maestro, Switchboard). companyOS serves as the authoritative source of truth for organizational identity, entitlements, budgets, and policies.

## Module Definitions

### 1. companyOS (Authoritative)
- **Role**: Identity, Org, Roles, Entitlements, Budgets, Policies, Audit.
- **Authority**: Owns all governance objects.
- **Write Direction**: Authoritative writes only.
- **Exports**: `Org`, `Role`, `Entitlement`, `Budget`, `Policy`, `PolicyVersion`, `AuditEvent`.

### 2. Summit Core (Consumer)
- **Role**: Business logic and application features.
- **Authority**: Consumes companyOS facts and constraints.
- **Write Direction**: Read-only consumption of companyOS objects.

### 3. IntelGraph (Provenance/Evidence)
- **Role**: Immutable evidence and provenance store.
- **Authority**: Owns evidence records (EVID).
- **Write Direction**: Append-only; receives evidence from Switchboard/Maestro. No back-writes to companyOS.

### 4. Maestro (Jobs/Orchestration)
- **Role**: Job execution and long-running runs.
- **Authority**: Enforces policy at job boundaries.
- **Interactions**: Consults companyOS PDP before run; emits evidence to IntelGraph.

### 5. Switchboard (Flows/Agents)
- **Role**: Agent execution and tool invocation.
- **Authority**: Enforces policy at tool/flow boundaries.
- **Interactions**: Consults companyOS PDP before tool call; emits evidence to IntelGraph.

## Write Direction Rules
- companyOS **writes**: identity/org/entitlements/budgets/policies/audit.
- Summit core **reads**: org facts + constraints only.
- Switchboard/Maestro **read**: policies + budgets; **write**: evidence to IntelGraph only.
- IntelGraph **accepts**: append-only evidence; no back-writes to policy.
