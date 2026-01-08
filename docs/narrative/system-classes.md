# Classes of Systems, Not Feature Lists

> **Thesis:** Comparing Summit to a SIEM or a SOAR is a category error. Those are tools for _reacting_ to events. Summit is a platform for _governing_ existence.

The market is crowded with point solutions. To understand Summit, we must stop comparing feature lists (e.g., "Does it have a dashboard?") and start comparing **system classes**.

## The Hierarchy of Control

We classify systems by their relationship to the "Truth" of the environment.

| System Class                    | Primary Function    | Relationship to Truth           | Example Tools                |
| :------------------------------ | :------------------ | :------------------------------ | :--------------------------- |
| **Observer (Level 1)**          | Watch and Alert     | "I see something happened."     | Splunk, Datadog, CloudWatch  |
| **Actor (Level 2)**             | Execute Scripts     | "I did what you told me."       | Ansible, Terraform, Zapier   |
| **Orchestrator (Level 3)**      | Coordinate Actors   | "I managed the workflow."       | Airflow, SOAR (alert-driven) |
| **Governor (Level 4 - Summit)** | **Enforce & Prove** | **"I ensured it was correct."** | **Summit**                   |

## Comparison: Why This Is Different

### 1. vs. SIEM (Security Information and Event Management)

- **SIEM** aggregates logs to help you find a needle in a haystack _after_ a breach.
- **Summit** generates the needle (evidence) and structured data _during_ the operation.
- _Difference:_ SIEM is forensic (past tense). Summit is operational (present/future tense).

### 2. vs. SOAR (Security Orchestration, Automation, and Response)

- **SOAR** runs playbooks triggered by alerts. It is reactive glue.
- **Summit** maintains the state of the world. It prevents the bad state from happening via policy gates, rather than just cleaning it up.
- _Difference:_ SOAR patches wounds. Summit enforces safety gear.

### 3. vs. Agent Frameworks (LangChain, AutoGPT)

- **Agent Frameworks** are runtime libraries for building bots. They lack memory, provenance, and governance by default.
- **Summit** is the "Operating System" those agents run on. It provides the rails, the audit log, and the identity layer that makes agents safe for enterprise.
- _Difference:_ Agent Frameworks are the engine. Summit is the chassis, brakes, and steering.

## What Others Must "Bolt On"

When you buy a standard tool, you often have to build the "Enterprise Layer" yourself. Summit comes with this layer as the core product.

- **Provenance:** Others treat logs as text. We treat them as cryptographically linked chains.
- **Identity:** Others rely on simple API keys. We enforce ephemeral, scoped, verifiable identity for every machine actor.
- **Human-in-the-Loop:** Others add this as a UI feature. We bake it into the state machine (Arbitration Engine).

## Conclusion

Don't ask "Does Summit verify logs?" Ask "Does your current system _guarantee_ the integrity of the action?"
Summit is not a better screwdriver. It is a machine shop that ensures every screw is torqued to spec.
