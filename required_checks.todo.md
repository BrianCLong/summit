# Required checks discovery (TODO)
1) Open GitHub repo → Settings → Branches → Branch protection rules.
2) List required status checks and their exact names.
3) Replace temporary check names in `.github/workflows/jetrl-ci.yml`.
4) Verify that `ci/verify_cogwar_evidence.py` is included in the CI pipeline (or will be).
