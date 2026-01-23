# Draft PR Promotion Protocol

## Purpose

Prevent draft PR accumulation, restore predictable throughput, and ensure that *only intentional, review-ready work* competes for merge capacity.

## Scope

Applies to **all draft PRs** in `BrianCLong/summit`, regardless of origin (human or agent).

---

## Draft PR Lifecycle States

Each draft PR must be explicitly classified into **one** of the following states within **7 calendar days** of creation:

### A. **Promotion-Ready**

Criteria (all required):

* CI passes or is explicitly disabled with justification
* Scope is atomic and aligned to a single issue / governance artifact
* No unresolved TODOs that block review
* Title and description accurately reflect content

**Action:**
→ Remove Draft status
→ Enter merge queue

---

### B. **Active Development**

Criteria:

* Incomplete but progressing
* Clear next step exists
* Owner is explicit (agent or human)

**Required PR Description Block:**

```markdown
## Draft Status
Owner: <name | agent>
Next Action: <specific>
Blocker (if any): <explicit>
Target Promotion Date: <YYYY-MM-DD>
```

**Action:**
→ Remains Draft
→ Reviewed weekly

---

### C. **Exploratory / Parking**

Criteria:

* Research, spike, or speculative work
* Not intended for near-term merge

**Action:**
→ Labeled `exploratory`
→ Excluded from GA readiness metrics
→ Auto-close after 30 days unless promoted

---

### D. **Obsolete**

Criteria:

* Superseded by merged work
* Invalidated by design change
* Broken beyond economical repair

**Action:**
→ Close with reason
→ Link successor PR or commit if applicable

---

## Enforcement Mechanisms

* **Weekly Draft Sweep**

  * Any draft PR missing classification → **forced Obsolete review**
* **No Silent Drafts**

  * Draft PRs without an owner or next action are non-compliant
* **GA Cut Rule**

  * No draft PR counts toward GA readiness or confidence scoring

This protocol converts drafts from “ambient noise” into **explicitly governed work-in-progress**.
