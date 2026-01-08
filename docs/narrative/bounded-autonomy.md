# Bounded Autonomy as a Social Contract

## Breakthrough Concept

Autonomy is often framed as a binary: a system is either "human-in-the-loop" (manual) or "autonomous" (out of control). Summit rejects this dichotomy in favor of **Bounded Autonomy**.

In Summit, autonomy is treated as a **Social Contract** between the machine and the institution.

### The Contract Terms

Just as a human employee has an employment contract defining their role, authorities, and limits, a Summit agent operates under an **Autonomy Charter**.

This charter explicitly defines:

1.  **Scope of Action:** What the agent _may_ do (e.g., "Adjust cooling systems," "Route traffic").
2.  **Constraints:** What the agent _must not_ do (e.g., "Never exceed $500 spend," "Never block emergency ports").
3.  **Oversight:** Who must approve exceptions or changes (e.g., "Requires Senior Engineer approval for >10% change").
4.  **Revocation:** Under what conditions this autonomy is suspended (e.g., "If error rate > 1%," "If human override received").

## Narrative Framing

> _Autonomy is granted, scoped, and revocable._

We do not "build" autonomous agents; we **charter** them. This shift in language and architecture makes advanced AI compatible with risk-averse institutions.

## Key Artifact: The Autonomy Charter

An Autonomy Charter is a machine-readable declaration (signed and versioned) that serves as the "constitution" for a specific agent or workflow.

Example Structure:

- **Grantee:** Infrastructure Optimization Agent v4.2
- **Grantor:** VP of Engineering
- **Domain:** Production Cluster US-East
- **Authorities:**
  - `scale_replicas` (Max: 100)
  - `migrate_pods` (Allowed windows: 02:00-04:00 UTC)
- **Constraints:**
  - `cost_cap`: $5000/day
  - `latency_target`: < 200ms
- **Revocation Triggers:**
  - Any P1 Incident
  - Manual Killswitch #4

This is extremely forward-looking. It implies that in the future, we will not debug AI behavior; we will **litigate AI charters**.
