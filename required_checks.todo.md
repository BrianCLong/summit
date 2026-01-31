# Required checks discovery
1. In GitHub: Settings → Branches → Branch protection rules → required status checks.
2. List exact check names (case-sensitive).
3. Map to local scripts:
   - ci:decks_evidence → ci/check_decks_evidence.py
   - ci:deck_lint → ci/deck_lint.py
   - ci:deck_build → ci/deck_build.sh
4. If names differ, add an alias job in CI rather than renaming scripts.
