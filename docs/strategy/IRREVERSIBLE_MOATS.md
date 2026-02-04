# Irreversible Moats

> **Status:** STRATEGY
> **Owner:** Jules (Chief Architect)
> **Last Updated:** 2025-05-15

## The Thesis of Irreversibility

True defensibility comes not from data lock-in (which is hostile) but from **operational superiority** that, once experienced, makes previous ways of working unacceptable.

We create moats by raising the baseline of what is considered "safe" and "efficient". Once a customer relies on Summit's guarantees, reverting to a competitor's tool feels like a massive regression in risk posture and velocity.

## Moat 1: The Evidence Lineage (The "Chain of Custody" Moat)

**Mechanism:** `ProvenanceLedgerV2` (Merkle Roots & Signed Entries)

* **The Lock:** Auditors and Security Teams become dependent on the ability to mathematically prove *who* did *what* and *when*.
* **The Regression:** Moving to a standard logging system (Splunk/ELK) means losing the cryptographic chain. Logs become mutable, deniable, and untrusted.
* **Irreversibility Factor:** High. Once a Compliance Officer knows they can demand a "Signed Root", they will never accept a plain text log again.

## Moat 2: Encoded Institutional Knowledge (The "Policy" Moat)

**Mechanism:** `PolicyEngine` (Rego Rules & Risk Scoring)

* **The Lock:** Summit captures the nuanced, unwritten rules of the organization (e.g., "Don't deploy high-risk changes on Fridays unless VP approves") into executable code (`DEFAULT_POLICY_RULES`).
* **The Regression:** Migrating away means re-implementing these complex logic trees into simple RBAC (which can't handle them) or manual wiki pages (which are ignored).
* **Irreversibility Factor:** Medium-High. The cost of translating "Policy-as-Code" back to "Policy-as-Paper" is prohibitive.

## Moat 3: The Agent Lattice (The "Safety" Moat)

**Mechanism:** `EnhancedAutonomousOrchestrator` (Idempotency & Safety Categories)

* **The Lock:** Operators trust agents to execute tasks because the Orchestrator enforces safety bounds (budgets, kill-switches, dry-runs).
* **The Regression:** "Standard" agents are often black boxes. Moving away from Summit means losing the ability to audit *why* an agent made a decision or to mechanically stop it.
* **Irreversibility Factor:** High. Once you trust a safe robot, you won't hire a reckless one.

## Moat 4: Governance as Velocity (The "Speed" Moat)

**Mechanism:** Auto-Approvals & Passive Attestation

* **The Lock:** Developers ship faster because low-risk changes are auto-approved by the Policy Engine, and evidence is collected automatically.
* **The Regression:** Leaving Summit means returning to manual "Change Approval Boards" (CABs) and manual evidence gathering (screenshots).
* **Irreversibility Factor:** Critical. Engineers will revolt if forced back to manual bureaucracy.

## Execution Strategy

To deepen these moats:

1. **Expose the Roots:** Make the `LedgerRoot` visible in the UI. Make the "Green Checkmark" addictive.
2. **Gamify Policy:** Show developers how "safe" their changes are. "Your change has a Risk Score of 10/100 -> Auto-Deploying."
3. **Standardize the Lattice:** Encourage users to write their own `Tasks` that hook into our Orchestrator, creating ecosystem lock-in.
