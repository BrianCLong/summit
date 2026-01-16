## Branch Protection Reconciliation - Admin-Ready Package

I've completed the analysis and preparation for Issue #15790. Since admin access is not currently available in this environment, I've prepared a complete **admin-ready apply package** that can be executed in <10 minutes.

### 📋 Summary

**Current State:** Branch protection exists on `main`, but **required status checks are NOT enabled** (API endpoint returns 404).

**Action Required:** Enable required status checks with **7 check contexts** as defined in the policy.

**Admin Access Required:** Yes (this is the blocker preventing immediate application).

---

### 📦 Deliverables

All artifacts have been committed to the `evidence/` directory:

| Artifact | Path | Purpose |
|----------|------|---------|
| **Reconciliation Plan (Markdown)** | `evidence/branch-protection-reconciliation-2026-01-16T01-15-54Z.md` | Human-readable plan with all options |
| **Reconciliation Plan (JSON)** | `evidence/branch-protection-reconciliation-2026-01-16T01-15-54Z.json` | Machine-readable artifact |
| **Executable Runbook** | `evidence/branch-protection-reconciliation-runbook-2026-01-16T01-15-54Z.sh` | One-command apply script |

---

### ✅ Required Status Checks (from policy)

According to `docs/ci/REQUIRED_CHECKS_POLICY.yml` v2.0.0 (branch_protection section):

1. `CI Core (Primary Gate)`
2. `CI / config-guard`
3. `CI / unit-tests`
4. `GA Gate`
5. `Release Readiness Gate`
6. `Unit Tests & Coverage`
7. `ga / gate`

**Additional setting:** `strict: true` (require branches to be up to date before merging)

---

### 🚀 Quick Apply Options for Admins

#### Option A: Executable Runbook (Recommended)

```bash
# One-command execution
export GH_TOKEN="<your-admin-token>"
bash evidence/branch-protection-reconciliation-runbook-2026-01-16T01-15-54Z.sh
```

This script will:
- ✅ Check prerequisites
- ✅ Show current state (before)
- ✅ Apply the configuration
- ✅ Verify the result (after)
- ✅ Provide success/failure confirmation

**Time:** ~1 minute

#### Option B: Manual GitHub UI

1. Go to [Settings → Branches → main protection rule](https://github.com/BrianCLong/summit/settings/branches)
2. Enable "Require status checks to pass before merging"
3. Enable "Require branches to be up to date before merging"
4. Add the 7 status check contexts listed above
5. Save changes

**Time:** ~5 minutes

#### Option C: Direct API Command

```bash
export GH_TOKEN="<your-admin-token>"

gh api repos/BrianCLong/summit/branches/main/protection/required_status_checks \
  -X PATCH \
  -H "Accept: application/vnd.github+json" \
  -f strict=true \
  -f contexts[]="CI Core (Primary Gate)" \
  -f contexts[]="CI / config-guard" \
  -f contexts[]="CI / unit-tests" \
  -f contexts[]="GA Gate" \
  -f contexts[]="Release Readiness Gate" \
  -f contexts[]="Unit Tests & Coverage" \
  -f contexts[]="ga / gate"
```

**Time:** ~2 minutes

---

### 🔍 Verification

After applying, verify with:

```bash
gh api repos/BrianCLong/summit/branches/main/protection/required_status_checks \
  | jq -r '.contexts[]' | sort
```

**Expected output:** All 7 checks listed (sorted alphabetically)

---

### ⚠️ Important Guardrails

- ✅ **DO NOT** weaken existing protections
- ✅ **DO NOT** reduce review requirements
- ✅ **DO NOT** disable "include administrators"
- ✅ **ONLY** enable required status checks (no other changes)

---

### 🐛 Note: Reconciler Script Issue

The existing `scripts/release/reconcile_branch_protection.sh` has a compatibility issue:
- It extracts from `always_required` (4 checks) instead of `branch_protection.required_status_checks.contexts` (7 checks)
- The installed `yq` version (0.0.0) doesn't support the `-o=json` flag the script expects

**Recommendation:** Use the provided runbook or manual options until the reconciler script is updated.

---

### 📊 Evidence Log

**Before State:**
```
API Endpoint: repos/BrianCLong/summit/branches/main/protection/required_status_checks
Status: 404 Not Found (required_status_checks not configured)
```

**After State (expected):**
```
Status: 200 OK
Contexts: 7 required checks
Strict: true
```

---

### 📝 Acceptance Criteria

- [ ] API endpoint returns 200 (not 404)
- [ ] All 7 required checks are configured
- [ ] `strict: true` is set
- [ ] Existing branch protection rules remain unchanged
- [ ] Manual test: Attempt to merge PR without passing checks (should be blocked)

---

### 🔗 References

- **Policy:** [docs/ci/REQUIRED_CHECKS_POLICY.yml](../docs/ci/REQUIRED_CHECKS_POLICY.yml) (v2.0.0)
- **Work Queue:** #16111
- **Priority:** Tier-1 (single immediate blocker)

---

**Status:** ⏸️ **BLOCKED - Awaiting admin execution**

Once an admin executes one of the options above, please:
1. Post verification results here
2. Update this issue status to "Done"
3. Proceed to next priority item (#14700 - SOC control tests in CI)
