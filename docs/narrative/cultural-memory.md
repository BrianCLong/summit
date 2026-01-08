# Cultural Memory: Culture as Executable Structure

## The Amnesia of Organizations

Organizations have terrible memories.

- **Turnover:** When a senior engineer leaves, they take their "why" with them.
- **Drift:** We repeat the same mistakes every 18 months because the post-mortem from the last time is buried in a Google Doc nobody reads.
- **Folklore:** Culture becomes a game of "telephone," transmitted via rumors and stories rather than facts. ("We don't use React here because Dave said it was bad in 2019.")

This amnesia is expensive. It forces organizations to constantly re-learn, re-litigate, and re-solve solved problems.

---

## The Summit Solution: Executable Memory

Summit treats organizational memory as **code**, not documents. It encodes the "lessons learned" directly into the platform's logic.

### 1. Decision Rationale Preservation

Every significant action in Summit (a deployment, a policy change, an exception) is linked to a **Decision Record**.

- We don't just see _that_ a port was opened.
- We see _who_ opened it, _why_ (linked to a ticket/strategy), _what_ evidence was provided, and _which_ policy allowed it.

The context is attached to the artifact forever.

### 2. "Never Again" as a Policy

When an incident occurs, the fix isn't just a patch—it's a new **Test** or **Policy**.

- **Incident:** A database migration caused a deadlock.
- **The Fix:** A `migration-check` policy is added to the CI pipeline to detect that specific deadlock pattern.
- **The Memory:** The organization has "learned" this mistake structurally. It creates a guardrail that prevents any future employee—even one who wasn't hired yet—from making the same error.

### 3. Culture Onboarding

New employees don't need to read a wiki to understand the culture. They encounter the culture as they work.

- They try to merge code without tests → The system gently nudges them to the testing guide.
- They try to deploy on a Friday afternoon → The system warns them about "Read-Only Fridays" (a cultural norm encoded as a soft constraint).

The platform _is_ the onboarding buddy.

---

## Artifact: Culture as Structure

| **Folklore (Old Way)**             | **Structure (Summit Way)**                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| "We value quality."                | A release gate requires 90% test coverage and 0 critical bugs.                |
| "We are a secure company."         | The pipeline automatically scans, signs, and creates an SBOM for every build. |
| "We move fast."                    | Golden Paths provision full environments in 5 minutes.                        |
| "Don't do that, it breaks things." | Automated policy `anti-pattern-check` prevents the specific action.           |

## Impact: The Long-Term Organization

By turning culture into executable memory, Summit decouples organizational wisdom from individual tenure.

- **Resilience to Turnover:** You can lose your "heroes," but you don't lose their wisdom. It's encoded in the guardrails they built.
- **Accumulated Advantage:** The organization gets smarter over time. Every incident makes the platform stronger, not just the people more scarred.

Summit ensures that the organization knows what it knows, and never forgets.
