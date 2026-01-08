# Legible Authority: Power You Can Point To

## The Core Problem: Illegible Power

In traditional software, authority is implicit. If a system takes an action (e.g., deletes a record, approves a loan, deploys a drone), it is assumed that the code "allowed" it. But as AI systems become more autonomous, this implicit permission is insufficient.

When a machine acts, three questions must be answerable immediately and definitively:

1.  **Capability:** _Could_ this be done? (Technical feasibility)
2.  **Authorization:** _Was_ this permitted? (Policy and governance)
3.  **Accountability:** _Who_ owns the outcome? (Human responsibility)

Currently, these three are collapsed into "the algorithm decided." This creates **illegible power**—actions that happen without a clear, traceable chain of command.

## The Summit Solution: The Authority Stack

Summit introduces a formal **Authority Stack** that decouples capability from authorization. An AI agent in Summit may have the _capability_ to execute a sensitive action, but it lacks the _authority_ until it can construct a valid proof of permission.

### The Stack Components

1.  **Human Mandate:** The root of trust. A human operator or institution grants a specific scope of power.
2.  **Policy Authorization:** Machine-readable rules (OPA policies, governance charters) that translate the mandate into constraints.
3.  **Agent Execution:** The AI system planning and proposing an action within those constraints.
4.  **Evidence & Replay:** The cryptographic proof that the action was authorized by the policy, which derives from the mandate.

## Narrative Framing: "Power You Can Point To"

Legible Authority means you can physically "point to" the source of a machine's power.

- "Why did the AI purchase this server capacity?"
- _Point to:_ The **Resource Allocation Charter** signed by the CTO.
- _Point to:_ The **Budget Policy** allowing variance up to 10%.
- _Point to:_ The **Trace** showing the demand spike that triggered the rule.

This transforms the black box into a glass house.

## Societal Impact

- **Regulators** can inspect authority chains without needing to understand the neural networks involved.
- **Leaders** can defend automated decisions publicly by showing the chain of command.
- **Citizens** and **Users** can trust that automation is not unaccountable force, but delegated agency.
