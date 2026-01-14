# Governance: Branch Protection Drift

**Check Name:** `Branch Protection Drift` (Job: `branch-protection-drift`)

This check ensures that the "Required Status Checks" in GitHub Branch Protection rules for `main` match the policy defined in `docs/ci/REQUIRED_CHECKS_POLICY.yml`.

## Why is this required?

We use Policy-as-Code to define our release gates. This check acts as a **Strict Mode** enforcer to prevent:
1.  **Drift:** Admins changing GitHub settings manually without updating policy.
2.  **Stale Policy:** Policy updates merging without applying them to GitHub.
3.  **Missing Gates:** Ensuring critical gates (like Security or Legal) are actually enforced by GitHub.

## Configuration

This workflow requires a **Personal Access Token (PAT)** or **GitHub App Token** with `Administration: Read` permissions to inspect branch protection rules.

### Secret Setup

1.  **Generate Token:**
    *   **Type:** Fine-grained Personal Access Token
    *   **Repository Access:** Only this repository
    *   **Permissions:**
        *   `Administration`: **Read-only**
        *   `Contents`: **Read-only**
    *   **Note:** Do NOT grant Write access.

2.  **Add Secret:**
    *   Go to **Settings** -> **Secrets and variables** -> **Actions**.
    *   Name: `GOVERNANCE_DRIFT_TOKEN`
    *   Value: `<your-token>`

## Handling Failures (Red Check)

If this check fails, it means **Drift was detected**.

### Diagnosis
1.  Click "Details" on the failed check.
2.  Read the **Job Summary**. It will list:
    *   **Missing in GitHub:** Checks required by policy but not in GitHub settings.
    *   **Extra in GitHub:** Checks in GitHub settings but not in policy.
3.  Download the `drift-evidence` artifact for full JSON/Markdown reports.

### Remediation

**Option A: Update GitHub (Enforce Policy)**
*   If the policy is correct, update GitHub Branch Protection to match it.
*   Go to **Settings** -> **Branches** -> **Branch protection rules**.
*   Add/Remove checks as indicated by the report.

**Option B: Update Policy (Reflect Reality)**
*   If GitHub settings are correct (e.g., a new check was manually added), update the policy.
*   Edit `docs/ci/REQUIRED_CHECKS_POLICY.yml`.
*   Add/Remove checks in the `always_required` section.
*   Merge the PR.

## Admin Handoff

Once this workflow is stable:
1.  Go to **Settings** -> **Branches**.
2.  Edit the `main` branch protection rule.
3.  Search for `Branch Protection Drift`.
4.  Check the box to **Require this check to pass before merging**.

This ensures that `main` can never drift from the defined policy.
