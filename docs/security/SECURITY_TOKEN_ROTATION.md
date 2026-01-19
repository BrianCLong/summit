# Security Token Rotation: Mirroring Tokens

**Last Updated:** 2026-01-19
**Status:** Urgent Action Required (Expiring Tokens)

## Executive Summary
Two GitHub Personal Access Tokens (PATs) used for bidirectional repository mirroring are set to expire. These tokens must be rotated immediately to prevent disruption to auto-sync workflows. This document outlines the rotation procedure, inventory, and long-term migration plan to GitHub Apps.

## Identified Tokens
| Token Name | Scope | Workflow | Direction |
| :--- | :--- | :--- | :--- |
| `PERSONAL_MIRROR_TOKEN` | `repo`, `workflow` | `.github/workflows/mirror-to-personal.yml` | `TopicalityLLC/Summit` -> `BrianCLong/summit` |
| `ENTERPRISE_MIRROR_TOKEN` | `repo`, `workflow` | `.github/workflows/.archive/mirror-to-enterprise.yml` | `BrianCLong/summit` -> `TopicalityLLC/Summit` |

## Immediate Action: Rotation Playbook

### 1. Inventory Usage
Run the following command to confirm usage locations in the codebase:
```bash
# Search for references to the mirror tokens
grep -rE "PERSONAL_MIRROR_TOKEN|ENTERPRISE_MIRROR_TOKEN" .
```

### 2. Generate Replacements
For immediate rotation (Short-term fix):
1.  **Generate new PAT (Classic)**
    *   **Scopes:** `repo` (full control of private repositories), `workflow` (update GitHub Action workflows).
    *   **Expiration:** Set to 90 days.
    *   **Note:** Store the expiration date in your calendar.

2.  **Update Secrets**
    *   Navigate to **Settings > Secrets and variables > Actions**.
    *   Update `PERSONAL_MIRROR_TOKEN` and `ENTERPRISE_MIRROR_TOKEN` with the new values.
    *   **Important:** Do not change the secret name, update the value in place.

### 3. Verification
1.  Manually trigger the `mirror-to-personal.yml` workflow (if dispatch is enabled) or push a dummy commit to a test branch.
2.  Verify the run succeeds without "Bad credentials" errors.

## Strategic Migration: GitHub App (Recommended)

To avoid managing rotating PATs, replace them with a GitHub App.

### Setup Steps

1.  **Create GitHub App**
    *   Go to **Organization Settings > Developer settings > GitHub Apps > New GitHub App**.
    *   **Name:** `Summit-Mirror-Sync` (or similar).
    *   **Homepage URL:** `https://github.com/TopicalityLLC/Summit`.
    *   **Callback URL:** (Leave blank or use homepage).
    *   **Permissions:**
        *   **Repository permissions:**
            *   `Contents`: Read and Write (to push code).
            *   `Workflows`: Read and Write (to trigger workflows).
            *   `Metadata`: Read-only.
    *   **Subscribe to events:** `Push` (optional, if using webhooks).

2.  **Install App**
    *   Install the App on both `TopicalityLLC/Summit` and `BrianCLong/summit`.

3.  **Configure Actions**
    *   Store the **App ID** as a secret: `APP_ID`.
    *   Store the **Private Key** (generated during creation) as a secret: `APP_PRIVATE_KEY`.

4.  **Update Workflows**
    *   Use a tool like `tibdex/github-app-token` to generate a token from the App ID and Private Key.
    *   Replace `${{ secrets.PERSONAL_MIRROR_TOKEN }}` with the generated token.

    ```yaml
    steps:
      - name: Generate token
        id: generate_token
        uses: tibdex/github-app-token@v1
        with:
          app_id: ${{ secrets.APP_ID }}
          private_key: ${{ secrets.APP_PRIVATE_KEY }}

      - name: Push to remote
        run: |
          git remote add mirror https://x-access-token:${{ steps.generate_token.outputs.token }}@github.com/Target/Repo.git
          git push mirror main
    ```

## 10-Minute Checklist (Rotation)

- [ ] **Map where each token is referenced.** (Completed in this doc)
- [ ] **Create fine-grained replacement(s) or a GitHub App.**
- [ ] **Update the SAME secret names at org/repo scope.**
- [ ] **Re-run workflows; confirm mirrors sync.**
- [ ] **Commit this note.** (Done)
