#!/usr/bin/env bash
set -euo pipefail

log(){ printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok(){ printf "\033[1;32m✓\033[0m %s\n" "$*"; }

SHELL_NAME="$(basename "${SHELL:-bash}")"
add_line(){ local line="$1" rc="$2"; grep -qsF "$line" "$rc" 2>/dev/null || echo "$line" >> "$rc"; }

# ---------- Editor & Git ergonomics ----------
log "Editor, diffing, ignores, hooks…"
git config --global core.editor "code --wait || nvim || vim"
git config --global diff.tool "delta"
git config --global interactive.diffFilter "delta --color-only"
git config --global delta.navigate true
git config --global delta.line-numbers true
git config --global init.defaultBranch main
git config --global pull.rebase false
git config --global rebase.autostash true
git config --global fetch.prune true

# global ignore
GIG="$HOME/.gitignore_global"
cat > "$GIG" <<'EOF'
# OS / editors
.DS_Store
Thumbs.db
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
.idea/
# Env & build
.env
.env.*
*.log
dist/
build/
node_modules/
__pycache__/
*.py[cod]
*.egg-info/
.venv/
.uv/
# Terraform
.terraform/
terraform.tfstate*
# Coverage
.coverage
htmlcov/
coverage.xml
# Docker
*.tar
EOF
git config --global core.excludesfile "$GIG"

# pre-commit global default (optional)
mkdir -p ~/.config/pre-commit
cat > ~/.config/pre-commit/config.yaml <<'YAML'
repos:
- repo: https://github.com/pre-commit/pre-commit-hooks
  rev: v4.6.0
  hooks:
    - id: check-merge-conflict
    - id: end-of-file-fixer
    - id: trailing-whitespace
    - id: mixed-line-ending
- repo: https://github.com/psf/black
  rev: 24.8.0
  hooks:
    - id: black
      language_version: python3
- repo: https://github.com/charliermarsh/ruff-pre-commit
  rev: v0.6.8
  hooks:
    - id: ruff
      args: [--fix]
- repo: https://github.com/pre-commit/mirrors-prettier
  rev: v4.0.0-alpha.8
  hooks:
    - id: prettier
      additional_dependencies: [prettier, prettier-plugin-toml]
- repo: https://github.com/adrienverge/yamllint
  rev: v1.35.1
  hooks:
    - id: yamllint
- repo: https://github.com/terraform-linters/tflint
  rev: v0.55.0
  hooks:
    - id: tflint
- repo: https://github.com/antonbabenko/pre-commit-terraform
  rev: v1.98.0
  hooks:
    - id: terraform_fmt
    - id: terraform_validate
YAML
git config --global init.templateDir "~/.git-template"
mkdir -p ~/.git-template/hooks
cat > ~/.git-template/hooks/pre-commit <<'EOF'
#!/usr/bin/env bash
command -v pre-commit >/dev/null && exec pre-commit run --hook-stage commit --config ~/.config/pre-commit/config.yaml || exit 0
EOF
chmod +x ~/.git-template/hooks/pre-commit

# ---------- Starship prompt ----------
log "Starship prompt preset…"
mkdir -p ~/.config
cat > ~/.config/starship.toml <<'TOML'
add_newline = true
format = "$all"
[aws] disabled = false
[gcloud] disabled = false
[kubernetes] disabled = false
[git_status] staged = "●" modified = "✚" deleted = "✖" stashed = "⚑"
TOML

# ---------- tmux ----------
log "tmux sensible defaults…"
cat > ~/.tmux.conf <<'TMUX'
set -g mouse on
set -g history-limit 100000
setw -g allow-rename off
set -g prefix C-a
unbind C-b
bind C-a send-prefix
bind r source-file ~/.tmux.conf \; display "Reloaded!"
TMUX

# ---------- VS Code prefs (if present) ----------
if command -v code >/dev/null; then
  log "VS Code settings & extensions…"
  SETTINGS_DIR="$HOME/Library/Application Support/Code/User"
  [ "$(uname -s)" = "Linux" ] && SETTINGS_DIR="$HOME/.config/Code/User"
  mkdir -p "$SETTINGS_DIR"
  cat > "$SETTINGS_DIR/settings.json" <<'JSON'
{
  "editor.formatOnSave": true,
  "editor.tabSize": 2,
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "prettier.singleQuote": true,
  "terminal.integrated.defaultProfile.osx": "zsh",
  "python.analysis.typeCheckingMode": "basic",
  "ruff.organizeImports": true
}
JSON
  cat > "$SETTINGS_DIR/extensions.json" <<'JSON'
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "charliermarsh.ruff",
    "esbenp.prettier-vscode",
    "ms-azuretools.vscode-docker",
    "hashicorp.terraform",
    "github.vscode-github-actions",
    "redhat.vscode-yaml",
    "ms-vscode.makefile-tools",
    "ms-vscode-remote.vscode-remote-extensionpack"
  ]
}
JSON
  # install common extensions if `code` supports it
  code --install-extension ms-python.python || true
  code --install-extension charliermarsh.ruff || true
  code --install-extension esbenp.prettier-vscode || true
  code --install-extension ms-azuretools.vscode-docker || true
  code --install-extension hashicorp.terraform || true
  code --install-extension github.vscode-github-actions || true
  code --install-extension redhat.vscode-yaml || true
fi

# ---------- Shell rc lines ----------
for rc in "$HOME/.${SHELL_NAME}rc" "$HOME/.bashrc" "$HOME/.zshrc"; do
  [ -f "$rc" ] || touch "$rc"
  add_line 'export EDITOR="code -w || nvim || vim"' "$rc"
  add_line 'alias ll="eza -lah --git"' "$rc"
  add_line 'alias k=kubectl' "$rc"
  add_line 'complete -o default -F __start_kubectl k 2>/dev/null || true' "$rc"
done

ok "Post-setup complete. Open a new shell or: exec \$SHELL"

