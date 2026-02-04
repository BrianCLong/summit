# Batch 4 Implementation: GitHub Actions & Dependabot Hardening

**Status:** PLANNED  
**Timeline:** Week 4  
**Priority:** MEDIUM  
**Estimated Effort:** 25-35 hours

## Overview

Batch 4 improves CI/CD security posture by hardening GitHub Actions workflows and optimizing Dependabot configuration.

## Task 4.1: Pin GitHub Actions to Commit SHAs

### Context

Using action tags (e.g., `@v1`) instead of commit SHAs creates supply chain risk. Attackers can modify tags to inject malicious code.

### Current Status

**Workflow Files:** 100+ in `.github/workflows/`

**Current Pattern (Vulnerable):**
```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
- uses: actions/upload-artifact@v3
```

**Target Pattern (Secure):**
```yaml
- uses: actions/checkout@a5ac7e51b41094c7d3f6c4073a744c1823c3e7f6  # v4.1.0
- uses: actions/setup-node@b39dc117a55a50ff2d34ac0a59f3834125ad6148  # v4.0.0
- uses: actions/upload-artifact@26f96dfc697d77e81fd5907df203aa23a56210fab  # v4.3.0
```

### Implementation Steps

1. **Create script to identify current actions:**
   ```bash
   grep -r "uses:" .github/workflows/ | grep -v "^#" | sort | uniq
   ```

2. **Get commit SHAs for each action:**
   ```bash
   # For each action, get the latest commit SHA
   # Example: actions/checkout@v4 → a5ac7e51b41094c7d3f6c4073a744c1823c3e7f6
   ```

3. **Update workflow files:**
   ```yaml
   # Replace all action tags with commit SHAs
   # Use find and replace or script
   ```

4. **Verify updates:**
   ```bash
   grep -r "uses:" .github/workflows/ | grep -v "^#" | grep -v "@[a-f0-9]\{40\}"
   ```

### Workflow Files to Update

**Key Workflows:**
- `_reusable-*.yml` (reusable workflows)
- `ci.yml` (main CI pipeline)
- `release.yml` (release pipeline)
- `security.yml` (security scanning)
- All other workflows in `.github/workflows/`

### Testing

- [ ] All actions pinned to commit SHAs
- [ ] CI/CD pipeline still functions
- [ ] No broken workflows
- [ ] All checks pass

### Success Criteria

- All 100+ GitHub Actions pinned to commit SHAs
- CI/CD pipeline remains functional
- No broken workflows

---

## Task 4.2: Restrict GITHUB_TOKEN Permissions

### Context

GITHUB_TOKEN has broad permissions by default. Restricting to least-privilege reduces blast radius of compromised workflows.

### Current Status

**Workflows with Token Usage:** All workflows using `actions/*` or GitHub API

### Implementation Steps

1. **Add permissions block to each workflow:**
   ```yaml
   permissions:
     contents: read
     packages: read
     # Add only required permissions
   ```

2. **Common Permission Patterns:**

   **Read-only workflows:**
   ```yaml
   permissions:
     contents: read
   ```

   **Build & test workflows:**
   ```yaml
   permissions:
     contents: read
     packages: read
   ```

   **Release workflows:**
   ```yaml
   permissions:
     contents: write
     packages: write
   ```

   **Security scanning:**
   ```yaml
   permissions:
     contents: read
     security-events: write
   ```

3. **Update all workflow files:**
   - Add `permissions:` block at top level
   - Add job-level permissions if needed
   - Remove default broad permissions

4. **Test workflows:**
   ```bash
   # Trigger workflows and verify they still work
   ```

### Testing

- [ ] All workflows have explicit permissions
- [ ] CI/CD pipeline functions correctly
- [ ] No permission-related failures
- [ ] Security scanning still works

### Success Criteria

- All workflows have least-privilege permissions
- CI/CD pipeline remains functional
- No permission-related errors

---

## Task 4.3: Enable Dependabot Auto-Merge

### Context

Dependabot creates PRs for dependency updates. Auto-merge for safe updates reduces manual review burden.

### Current Configuration

**File:** `.github/dependabot.yml`

**Current Status:**
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

### Implementation Steps

1. **Update dependabot.yml:**
   ```yaml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
       auto-merge:
         enabled: true
         update-types:
           - "minor"
           - "patch"
   ```

2. **Apply to all ecosystems:**
   - npm (all directories)
   - Python (pip)
   - Rust (cargo)
   - Go (gomod)
   - GitHub Actions

3. **Configure branch protection:**
   - Ensure auto-merge is allowed
   - Verify required checks pass before merge

4. **Test auto-merge:**
   - Create a test PR
   - Verify auto-merge triggers

### Testing

- [ ] Dependabot auto-merge configured
- [ ] Test PR auto-merges successfully
- [ ] Required checks pass before merge
- [ ] No manual intervention needed

### Success Criteria

- Dependabot auto-merge enabled for patch/minor updates
- Branch protection allows auto-merge
- Test PRs auto-merge successfully

---

## Pull Requests to Create

### PR 4a: Pin GitHub Actions to Commit SHAs

**Title:** `ci: pin GitHub Actions to commit SHAs for supply chain security`

**Description:**
- Pins all 100+ GitHub Actions to commit SHAs
- Prevents tag-based attacks
- Maintains functionality of all workflows

**Files Changed:**
- All `.github/workflows/*.yml` files

**Tests:**
- CI/CD pipeline functions
- All workflows execute successfully
- No broken actions

### PR 4b: Restrict GITHUB_TOKEN Permissions

**Title:** `ci: restrict GITHUB_TOKEN permissions to least-privilege`

**Description:**
- Adds explicit permissions blocks to all workflows
- Restricts to only required permissions
- Reduces blast radius of compromised workflows

**Files Changed:**
- All `.github/workflows/*.yml` files

**Tests:**
- All workflows execute successfully
- No permission-related failures
- Security scanning still works

### PR 4c: Enable Dependabot Auto-Merge

**Title:** `ci: enable Dependabot auto-merge for patch and minor updates`

**Description:**
- Enables auto-merge in Dependabot configuration
- Reduces manual review burden
- Maintains security by only auto-merging safe updates

**Files Changed:**
- `.github/dependabot.yml`

**Tests:**
- Dependabot auto-merge functions
- Test PRs auto-merge successfully
- Required checks pass before merge

---

## Implementation Checklist

### Phase 1: Action Pinning
- [ ] Identify all GitHub Actions in use
- [ ] Get commit SHAs for each action
- [ ] Update all workflow files
- [ ] Verify no broken workflows
- [ ] Create PR 4a

### Phase 2: Permission Restriction
- [ ] Add permissions blocks to all workflows
- [ ] Set least-privilege permissions
- [ ] Test all workflows
- [ ] Create PR 4b

### Phase 3: Dependabot Auto-Merge
- [ ] Update dependabot.yml
- [ ] Configure auto-merge for all ecosystems
- [ ] Test auto-merge functionality
- [ ] Create PR 4c

## Success Criteria

- [ ] All actions pinned to commit SHAs
- [ ] All workflows have explicit permissions
- [ ] Dependabot auto-merge enabled
- [ ] CI/CD pipeline remains functional
- [ ] All PRs pass CI checks
- [ ] Code review completed

## Risk Assessment

### Risks

1. **Workflow Breakage:** Pinning actions may break workflows
2. **Permission Errors:** Restricting permissions may cause failures
3. **Auto-Merge Issues:** Auto-merge may merge unsafe updates

### Mitigation

1. Test all workflows after changes
2. Monitor for permission-related failures
3. Configure auto-merge carefully (patch/minor only)
4. Have rollback plan ready

## Timeline

| Week | Task | Status |
|------|------|--------|
| 4 | Action pinning | Not Started |
| 4 | Permission restriction | Not Started |
| 4 | Dependabot auto-merge | Not Started |
| 4 | PR review and merge | Not Started |

---

**Document Version:** 1.0  
**Last Updated:** January 14, 2026  
**Prepared by:** Manus AI Security Implementation
