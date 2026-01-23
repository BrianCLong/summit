# Mega-PR Containment Runbook

This runbook describes how to manage oversized Pull Requests ("Mega PRs") using the containment system.

## 🚨 When to use this

Use this process when a PR triggers one of the following alerts or is visibly too large to review safely:
- Changed files > 20
- Additions/Deletions > 1000 lines
- Critical path changes combined with large feature work

## 🛠️ Generating a Split Plan

1. **Go to Actions:** Navigate to the "Actions" tab in the GitHub repository.
2. **Select Workflow:** Choose **"Mega PR Containment"** from the left sidebar.
3. **Run Workflow:**
   - Click "Run workflow".
   - Enter the **PR Number** (e.g., `123`).
   - (Optional) Check "Generate patch files" if you want `.patch` artifacts to apply manually.
   - Click **Run workflow**.

## 📦 Using the Artifacts

Once the workflow completes, download the `mega-pr-<number>-plan` artifact. It contains:

- `MEGA_PR_<num>_SPLIT_PLAN.md`: A human-readable report with the slice strategy.
- `MEGA_PR_<num>_SPLIT_PLAN.json`: Machine-readable data.
- `patches/`: (If requested) Git patch files for each slice.

### The Split Plan
The plan divides the PR into slices (S1, S2, etc.) based on risk and dependencies.

- **S1 (Critical/Base):** Often contains tooling, config, CI, or shared library changes. **Must merge first.**
- **Safe Slices:** Documentation or isolated tests. Can be parallelized if no dependencies.
- **Feature Slices:** Grouped by directory (e.g., `frontend/`, `server/`).

## ⚔️ Execution Strategy (Manual Split)

If you did not generate patches, or prefer to do it manually:

1. **Checkout the PR branch:**
   ```bash
   git fetch origin pull/<PR>/head:pr-<PR>
   git checkout pr-<PR>
   ```

2. **Create Slice Branches:**
   For each slice in the plan (e.g., S1):
   ```bash
   git checkout -b split/pr-<PR>/s1-critical
   ```

3. **Reset and Pick Files:**
   Reset to main (keep changes in working dir) or pick specific files.
   *Method A (Reset):*
   ```bash
   git reset --mixed origin/main
   # Stage only files listed in S1 manifest
   git add .github/workflows/ci.yml package.json ...
   git commit -m "refactor(s1): critical tooling changes from PR #<PR>"
   git stash # Stash remaining changes
   git push -u origin split/pr-<PR>/s1-critical
   ```

   *Method B (Checkout):*
   ```bash
   git checkout origin/main -b split/pr-<PR>/s1-critical
   git checkout pr-<PR> -- .github/workflows/ci.yml package.json ...
   git commit -m "..."
   ```

4. **Verify & Open PR:**
   - Run the verification command listed in the plan (e.g., `pnpm test`).
   - Open a new PR for this slice.
   - **Link the original PR** in the description.

5. **Repeat:**
   - For S2, checkout S1 (if dependent) or main (if independent).
   - Apply S2 changes.

## 🤝 Handling "Entangled" Slices

If the tool groups too many files into one slice because they are in the same directory but you want to split them further:
- Use your judgment. The tool uses directory-based heuristics.
- Manually identify logical boundaries (e.g., "API types" vs "API implementation").

## 🚦 Rate Limits & Bots

If you are splitting a PR into 10+ slices:
- Do not open all PRs at once to avoid triggering rate limits or overwhelming CI.
- Open S1. Wait for merge.
- Open S2, S3. Wait.

## ⚠️ Rollback

If a slice causes a regression:
- The plan includes a rollback strategy.
- Generally: Revert in reverse order (Latest slice first).
- If S1 (Critical) is reverted, assume the environment is unstable until verified.
