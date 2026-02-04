# Daily Release Captain Dashboard

**Date**: [TODAY]
**Captain**: [YOUR_NAME]
**Status**: 🟢 OPERATIONAL | 🟡 DEGRADED | 🔴 OUTAGE

> **Single Source of Truth**: This dashboard guides the Release Captain through the daily triage, merge, and verification loop. It is designed to be useful even when CI is offline.

---

## 1. Today at a Glance

| State | Description | Action |
| :--- | :--- | :--- |
| **🟢 GREEN** | CI is passing, queue is moving. | **Merge freely** following the Shipping Checklist. |
| **🟡 YELLOW** | CI has flakes or non-blocking failures. | **Merge with caution**. Verify locally. Prioritize fixes. |
| **🔴 RED** | CI is hard failing. | **STOP**. Only "Allowed Merge Categories" (Docs/Metadata). Trigger [Unblocking Runbook](../runbooks/CI_RELEASE_GATE_RUNBOOK.md). |

---

## 2. Gates & Blockers

Before any merge, verify these gates are clear.

*   [ ] **CI Status**: GitHub Actions are green (or known flakes).
*   [ ] **Security**: No *new* Critical/High vulnerabilities. See [Security Backlog](../SECURITY_PHASE1_STARTER_PACK_BACKLOG.md).
*   [ ] **Evidence**: Evidence bundle can be generated and is valid.
*   [ ] **Governance**: Prompt hash registry is in sync (if prompts changed).

---

## 3. Allowed Merge Categories

When **CI is RED** (🔴), only the following PR types may be merged:

1.  **Documentation**: `docs/**/*.md` changes only.
2.  **Metadata/Governance**: `OWNERS`, `CODEOWNERS`, `registry.yaml` (if verified).
3.  **Emergency Fixes**: PRs explicitly labeled `emergency-fix` with approval from Engineering Lead.
4.  **Reverts**: Clean reverts of broken commits.

> **Strict Rule**: No behavior-changing code merges during RED state unless it is the *fix* for the RED state.

---

## 4. PR Shipping Checklist

For **every** PR, before clicking Merge:

1.  **Review Quality**: Code reviewed, tests added, description clear.
2.  **Verify Evidence**: Run the evidence generator locally if CI is suspect.
3.  **Check Collisions**: Ensure no file case collisions (Linux/Mac/Windows safety).
4.  **Verify Governance**: If `prompts/` changed, ensure `prompts/registry.yaml` is updated.
5.  **Merge**: Squash and merge.

---

## 5. Operational Commands

Copy-paste these commands to verify state locally.

### A. Local Health Check
```bash
# Check for uncommitted changes or dirty state
git status

# Check for huge files accidentally added
find . -type f -size +1M
```

### B. Generate Evidence Bundle
Use this to verify that the PR artifacts are compliant.
```bash
# Run the evidence generator
./scripts/generate-evidence-bundle.sh

# Verify output exists
ls -l evidence-bundle.zip
```

### C. Case Collision Scan
Prevent "works on Mac, breaks on Linux" issues.
```bash
# Find files with potential case collisions
git ls-files | tr '[:upper:]' '[:lower:]' | sort | uniq -d
```
*If output is empty, you are safe.*

### D. Prompt Hash Verification
If the PR touches `prompts/`, verify the registry.
```bash
# Check prompt registry consistency (if script exists)
# Or manually inspect:
cat prompts/registry.yaml
```

---

## 6. How to Unblock CI

If CI is **stuck** or **failing**:

1.  **Consult the Runbook**: [CI Release Gate Runbook](../runbooks/CI_RELEASE_GATE_RUNBOOK.md).
2.  **Emergency Bypass**: See "Emergency Bypass" section in the runbook.
3.  **Heal Monorepo**:
    ```bash
    ./scripts/monorepo_heal.mjs
    ```

---

## 7. Escalation

If you are blocked for > 1 hour:

*   **Slack**: `#release-engineering` or `#oncall`
*   **Repo Owner**: `@BrianCLong`
*   **Security**: `#security`

---

## 8. Daily Note Template

*Copy/paste this into your daily log or the `#release-updates` channel.*

```markdown
**release-captain daily log: [DATE]**

**Status**: 🟢 / 🟡 / 🔴
**Blockers**:
- [ ] Issue #...

**Priorities**:
1. Unblock CI (if red)
2. Merge PR #... (High Priority)
3. Triage Security Backlog

**Merge Queue**:
- [ ] PR #... (Ready)
- [ ] PR #... (Waiting on Evidence)

**End of Day Handoff**:
- ...
```
