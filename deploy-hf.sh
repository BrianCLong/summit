#!/usr/bin/env bash
# Usage: ./deploy-hf.sh HF_USER HF_SPACE SPACE_DIR
# Example: ./deploy-hf.sh BrianCLong summit-ui-static summit/hf-space-static
set -euo pipefail

HF_USER="${1:?Missing HF_USER}"
HF_SPACE="${2:?Missing HF_SPACE}"
SPACE_DIR="${3:?Missing SPACE_DIR}"

# --- Preflight ---
if ! command -v huggingface-cli >/dev/null; then
  echo "ERROR: huggingface-cli not found. Install with: pip install -U 'huggingface_hub[cli]'" >&2
  exit 1
fi
if ! command -v git >/dev/null; then
  echo "ERROR: git not found." >&2
  exit 1
fi
if [[ ! -d "$SPACE_DIR" ]]; then
  echo "ERROR: directory '$SPACE_DIR' not found." >&2
  exit 1
fi

pushd "$SPACE_DIR" >/dev/null

# --- Detect SDK (best-effort) for a friendly hint ---
SDK="unknown"
if [[ -f "Dockerfile" ]]; then
  SDK="docker"
elif [[ -f "index.html" && ! -f "app.py" ]]; then
  SDK="static"
elif [[ -f "app.py" ]]; then
  SDK="streamlit"
fi
echo "[deploy-hf] Dir='$SPACE_DIR' detected SDK ~> $SDK"

# --- Create the Space repo if needed (no-op if already exists) ---
echo "[deploy-hf] Ensuring Space '$HF_USER/$HF_SPACE' exists (type=space)"
huggingface-cli repo create "$HF_SPACE" --type space -y >/dev/null || true

# --- Initialize or reuse local git repo in the subfolder ---
if [[ ! -d ".git" ]]; then
  git init >/dev/null
  # Make this sub-repo isolated from the monorepo (avoid parent .git settings)
  git config user.name  "HF Deploy Bot"
  git config user.email "ci@local"
fi

# Respect typical noise
if [[ ! -f .gitignore ]]; then
  cat > .gitignore <<'EOF'
# generic
*.pyc
__pycache__/
.env
.venv
# node
node_modules/
dist/
# macOS
.DS_Store
EOF
fi

git add -A
git commit -m "deploy: update $(date -u +'%Y-%m-%dT%H:%M:%SZ')" >/dev/null || true
git branch -M main

# --- Point remote to the Space (idempotent) ---
REMOTE_URL="https://huggingface.co/spaces/${HF_USER}/${HF_SPACE}"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

# --- Push (requires 'huggingface-cli login' locally, or HF_TOKEN in CI) ---
echo "[deploy-hf] Pushing to $REMOTE_URL (branch: main)"
git push -u origin main

# --- Tag deployment ---
TAG_NAME="deploy-${HF_SPACE}-$(date -u +'%Y%m%d-%H%M%S')"
git tag -f "$TAG_NAME"
git push -f origin "$TAG_NAME"

# --- Post-push hints ---
readme_hint=false
if ! grep -q "sdk:" README.md 2>/dev/null; then
  readme_hint=true
fi

if [[ "$readme_hint" == true ]]; then
  cat <<EOF
[deploy-hf] HINT:
Your README.md doesn't include Hugging Face Spaces frontmatter.
Consider adding something like this at the very top for clearer UI:

---
title: $(basename "$SPACE_DIR")
emoji: 🚀
sdk: ${SDK}
app_file: $( [[ "$SDK" == "streamlit" ]] && echo "app.py" || [[ "$SDK" == "docker" ]] && echo "" || echo "index.html" )
pinned: false
---

EOF
fi

popd >/dev/null
