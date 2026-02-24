# Switchboard Disambiguation

## Definitions

*   **Summit Switchboard (Control Plane)**: The centralized authority for routing, policy enforcement, and provenance. It is the "brain" that decides *if* an action is allowed, issues credentials, and generates receipts. It never executes tools directly.
*   **Agent Switchboard (Data Plane)**: The distributed execution environment where agents live and tools run. It is the "muscle" that performs actions, but only when authorized by the Control Plane.

## Collision Matrix

| Term | What it is | How Ours Differs |
| :--- | :--- | :--- |
| **Switchboard (General)** | Any routing system (e.g., Twilio, internal RPC) | Ours is strictly for *governed agentic workflows*, not generic packet/call routing. |
| **LangChain Router** | A simple LLM prompt to pick a tool | Ours is a **deterministic, policy-enforced graph traversal**, not a probabilistic LLM guess. |
| **API Gateway** | A standard ingress (Kong, Nginx) | Ours understands **agent semantics** (intent, capability, context), not just HTTP headers. |
| **Service Mesh** | mTLS and traffic shaping (Istio) | Ours manages **application-layer capability grants**, not network-layer connectivity. |

## Naming Rules

1.  **Always use "Summit Switchboard"** in public materials and high-level docs to refer to the Control Plane product.
2.  **Never use bare "Switchboard"** if there is any ambiguity between Control and Data planes.
3.  **Use "Control Plane" and "Data Plane"** internally to distinguish technical boundaries.

## Canonical Description

> **Summit Switchboard** is the control plane for governed agentic AI. Unlike a standard API gateway or LLM router, it enforces a strict "Deny-by-Default" policy graph, ensuring that every agent action is authorized, scoped, and cryptographically proven before execution. It separates the *decision* to act (Control Plane) from the *execution* of the action (Data Plane), preventing unauthorized tool use and providing a replayable audit trail for every autonomous decision.
