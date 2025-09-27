# Upload to GitHub

You can import this bundle using either **git** or the **API uploader**.

## Option A — Git workflow (recommended)
```bash
BRANCH="docs/refresh-2025-08-13"
unzip intelgraph-docs-bundle.zip -d _pkg
git checkout -b "$BRANCH"
bash _pkg/tools/apply_docs_package.sh _pkg
```

## Option B — API uploader (no local git)
```bash
export GITHUB_TOKEN=<PAT_with_repo_scope>
python tools/push_via_api.py <owner>/<repo> intelgraph-docs-bundle.zip
```
