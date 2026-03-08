---
name: "♻️ Capture: PR Slicing & Recovery"
description: "Automatically generated task for a PR that was closed due to size, staleness, or failure."
labels: ["capture", "needs-triage"]
---

## 🛑 Automated PR Capture
This issue was generated automatically because Pull Request #{{PR_NUMBER}} triggered the `LANE/capture-close` policy.

**Original Author:** @{{AUTHOR}}
**Capture Reason:** [ ] `split-required` (Over 400 LoC/15 files) | [ ] `capture-needed` (Stale/Quarantined)

### 🎯 S-AOS Intent & Summary
*(Extracted from original PR body)*
> {{PR_BODY_SUMMARY}}

### ✂️ Proposed Slices (Action Required)
To merge this capability into Golden Main, break the work down into atomic PRs. Check off as you create them:
- [ ] **Slice 1:** [Core Logic / Types / Subsumption manifest] (PR: #____)
- [ ] **Slice 2:** [Unit & Integration Tests / Coverage] (PR: #____)
- [ ] **Slice 3:** [S-AOS Headers / Lineage Stamps / Docs] (PR: #____)

### ✅ Slice Acceptance Criteria
- [ ] S-AOS Headers present (`## Assumption Ledger`, `## Diff Budget`, `## Success Criteria`, `## Evidence Summary`).
- [ ] Agentic metadata block `<!-- AGENT-METADATA:START -->` intact.
- [ ] Passes `governance-meta-gate.mjs` (Lineage attestations verify).
- [ ] `CHANGELOG.md` unreleased section updated (or `skip-changelog` applied).

### ⚠️ Risk Constraints
*This PR touched the following high-risk paths. Ensure security gates pass:*
- {{RISK_PATHS_TOUCHED}}

---
*Agent Ledger:* `Capture initiated deterministically by CODEX Merge Engine.`
