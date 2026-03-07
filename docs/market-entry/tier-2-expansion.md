# Entry Tier 2 — Pull-Through Domains (Secondary Expansion)

These are teams that adopt Summit **because Tier 1 already trusts it**.

## Tier 2A: Platform & Infrastructure Teams

**Why they follow**

- They want autonomy without risk.
- Summit allows self-service _within bounds_.
- Security (Tier 1A) is usually their blocker; using Summit unblocks them.

**Use Cases**

- **Governed infrastructure changes**: "Apply this Terraform if it passes policy."
- **Policy-bounded automation**: "Scale up, but only if budget < $X."
- **Safe rollouts and reversions**: Automated rollback with evidence.

**Economic Effect**

- Reduced change failure rate.
- Lower escalation cost.
- Faster safe deployment.

## Tier 2B: AI / Data / ML Teams

**Why this works**

- They already fear governance retrofits and "AI Safety" bureaucracy.
- Summit gives them a _native governance spine_ that doesn't slow them down.

**Use Cases**

- **Model decision justification**: Why did the model flag this transaction?
- **Training data admissibility**: Provenance for every dataset.
- **Inference audit trails**: Record of inputs, outputs, and policy checks.

**Key Constraint**

- Never sell Summit as an ML tool.
- It is a **decision authority layer**.
