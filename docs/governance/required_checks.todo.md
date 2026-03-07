# Required Checks Discovery

1) Open GitHub repo → Settings → Branches → Branch protection rule.
2) Copy the exact check names under "Require status checks to pass".
3) Update `.github/workflows/ci-verify-qwen3-coder-next.yml` to match exact names.

Temporary convention: `verify/*` checks until the exact names are known.
