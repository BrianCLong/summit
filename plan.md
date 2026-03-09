1. **Create `scripts/repoos-quick-start.sh`**
   - Create a bash script that provides an interactive menu to run the various RepoOS scripts (`repoos-governor-demo.mjs`, `repoos-ga-validation-showcase.mjs`, `repoos-analysis.mjs`, `repoos-dashboard.mjs`).
   - Add execute permissions to the script.
   - Update `README.md` to include a section about the "Quick Demo".

2. **Standardize RepoOS Script Headers + CLI Flags**
   - Import `commander` and parse `--dry-run`, `--verbose`, and `--help` flags.
   - Modify `scripts/repoos-governor-demo.mjs`, `scripts/repoos-ga-validation-showcase.mjs`, `scripts/repoos-analysis.mjs`, `scripts/repoos-dashboard.mjs`, `scripts/classify_concern.mjs`, and `scripts/enforce_one_concern_one_pr.mjs` to parse these flags.

3. **Add Badges for RepoOS & Evidence Maturity**
   - Add `Shields.io` badges to `README.md` under the title.
   - Add a `## RepoOS Governance Layer (March 2026)` section to `README.md`.

4. **Complete pre-commit steps**
   - Run necessary checks.

5. **Commit and create atomic PRs**
   - Create 3 separate PRs for the tasks above to ensure atomic changes.
