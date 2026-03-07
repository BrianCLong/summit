# Incentive-Neutral Governance: Aligning Structure with Reality

## The Failure of Virtue-Based Governance

Traditional governance often relies on a fragile assumption: _that people will act against their own incentives for the greater good._

- We ask developers to prioritize documentation over shipping features (when they are promoted for shipping features).
- We ask sales teams to prioritize data hygiene over closing deals (when their commission depends on closing deals).
- We ask executives to prioritize long-term debt reduction over quarterly targets (when their tenure is judged by quarterly targets).

When governance fights incentives, **incentives always win.** The result is "Shadow IT," bypassed processes, and a culture of hidden non-compliance.

---

## The Summit Approach: Governance as the Path of Least Resistance

Summit does not ask people to be better. It accepts humans as they are: goal-oriented, efficiency-seeking, and imperfect.

Instead of fighting these drives, Summit **structures the environment** so that the "right" behavior is also the easiest, fastest, and most rewarding behavior.

### 1. Make Unsafe Behavior Harder and Visible

Summit does not ban unsafe behavior; it adds _friction_ and _attribution_ to it.

- **Scenario:** A developer wants to bypass a security check.
- **Traditional:** They turn it off and hope no one notices.
- **Summit:** They _can_ bypass it (to preserve autonomy), but they must:
  1.  Generate a `BreakGlass` token.
  2.  Provide a justification.
  3.  Acknowledge that this action is permanently logged to the `ProvenanceLedger`.
  4.  Trigger an immediate notification to the `#security-ops` channel.

The _cost_ of the shortcut (social friction + accountability) now outweighs the _benefit_. The incentives have shifted.

### 2. Make Safe Behavior Easier and Rewarded

Summit removes friction from compliant paths.

- **Scenario:** A team needs a new cloud environment.
- **Traditional:** Fill out a ticket, wait 2 weeks for approval. (High friction).
- **Summit:** Use a "Golden Path" template. Pre-approved, compliant by default, provisioned in 5 minutes. (Zero friction).

Compliance becomes a _accelerator_, not a blocker.

### 3. Evidence, Not Assurance

We stop asking people "Did you do X?" and start asking the system "Is X true?"

- **Virtue-Based:** "Did you run the tests?" (Relies on honesty/memory).
- **Incentive-Neutral:** Summit checks the `test_results.json` artifact in the build pipeline. (Relies on evidence).

---

## Artifact: The Incentive Map

**The Goal:** Shift the "Nash Equilibrium" of the organization toward compliance.

| Behavior                  | Incentive Profile (Before Summit)          | Incentive Profile (After Summit)                                   |
| :------------------------ | :----------------------------------------- | :----------------------------------------------------------------- |
| **Taking a Shortcut**     | High Reward (Speed) / Low Risk (Invisible) | Low Reward (Slowed by protocols) / High Risk (Visible attribution) |
| **Following Process**     | Low Reward (Slow) / Low Risk               | High Reward (Fast/Golden Path) / Low Risk                          |
| **Hiding a Mistake**      | High Reward (Avoid blame)                  | Impossible (Immutable Ledger)                                      |
| **Documenting Decisions** | Low Reward (Toil)                          | High Reward (Automated by System)                                  |

## Summary

**Governance that depends on virtue is a wish.**
**Governance that aligns with incentives is a system.**

Summit is an **incentive-shaping machine**. It aligns the self-interest of the individual (speed, ease, autonomy) with the interest of the organization (security, compliance, quality).
