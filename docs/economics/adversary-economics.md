# Adversary Cost Externalization

> **Thesis:** Counter-intelligence isn’t just about safety—it’s about economics. Summit raises the cost of attacking you until adversaries go elsewhere.

## The Economics of Cyber Attack

Attackers are rational economic actors. They have:

- **Budgets:** Time, compute, exploits.
- **ROI Targets:** Value of loot / Cost of attack.

**Defensive Goal:** Make `Cost of Attack` > `Value of Loot`.

## Summit’s Lever: Asymmetric Defense

### 1. The Cost of Reconnaissance (↑)

- **Mechanism:** Deception / Honey-tokens.
- **Effect:** Summit plants fake credentials and endpoints. Adversaries must spend massive effort verifying if a target is real or a trap.
- **Economic Impact:** Increases the "Customer Acquisition Cost" for the attacker.

### 2. The Cost of Persistence (↑)

- **Mechanism:** Continuous Provenance verification.
- **Effect:** "Living off the land" becomes impossible when every binary execution and config change is cross-referenced against the ledger.
- **Economic Impact:** Exploits have a shorter shelf-life. Attackers must burn 0-days faster.

### 3. The Cost of Evasion (↑)

- **Mechanism:** Behavioral baselining via the Knowledge Graph.
- **Effect:** Lateral movement stands out against the "Decision Capital" baseline of normal behavior.
- **Economic Impact:** Attackers must move slower to stay quiet, reducing their throughput.

## The Defender's Advantage (Flat Cost)

While we drive the attacker's costs up exponentially, Summit keeps the defender's cost flat.

- **Automated Response:** Bots fight bots. We don't need to hire more humans to fight more scripts.
- **Shared Intelligence:** One attack on Node A updates the defense for Node B instantly (zero marginal cost).

## The Adversary Cost Curve

We plot two lines:

1.  **Attacker Cost:** Rising exponentially over time as Summit hardens.
2.  **Defender Cost:** Flat or slightly declining (due to Cost Inversion).

**The Crossing Point:** The moment where the attacker gives up and moves to a softer target. This is "Economic Safety."

## Key Metrics

- **Attempts per Quarter:** Should decrease as word gets out (reputation).
- **Cost per Attempt:** Estimated resources burned by attacker (compute/time).
- **Defender Cost:** Staff + Tooling (should remain stable).

## Strategic Narrative

"We don't just block hackers. We bankrupt them."
