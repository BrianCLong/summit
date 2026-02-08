# Switchboard Disambiguation

This document clarifies the naming and scope of various "Switchboard" components within the Summit ecosystem.

## Summit Switchboard (Control Plane)

The **Summit Switchboard** is the centralized control plane responsible for:
- **Capability Registry**: Managing the catalog of available tools and services.
- **Policy Enforcement**: Deny-by-default preflight checks for all tool calls.
- **Credential Brokerage**: Just-in-time binding of credentials to authorized requests.
- **Action Receipts**: Emitting immutable, deterministic receipts for audit and traceability.
- **Routing**: Determining the optimal provider for a requested capability.

The public-facing name for this system is always **"Summit Switchboard"**.

## Agent Switchboard (Data Plane)

The **Agent Switchboard** (sometimes referred to as the "data plane") handles the execution of tool calls and the transport of data between agents and providers. It operates under the direction of the Summit Switchboard.

## Other Name Collisions

In the event of name collisions with legacy modules or third-party tools, the Summit Switchboard takes precedence as the primary orchestrator for capability-based routing.

## Summary

| Name | Role | Scope |
|------|------|-------|
| **Summit Switchboard** | Control Plane | Governance, Policy, Routing, Receipts |
| **Agent Switchboard** | Data Plane | Execution, Transport, Connectivity |
