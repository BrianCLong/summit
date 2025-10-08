```bash
#!/usr/bin/env bash
#
# Topicality "WIDEST USEFUL" Bootstrap — macOS (brew) & Ubuntu/Debian (apt)
# -----------------------------------------------------------------------------
# One script to stand up a full modern dev workstation with:
# - Core CLI, shells, dotfiles hooks
# - Package/runtimes (uv/Python, Node+nvm+pnpm+bun, Go, Rust, Java, .NET, Ruby)
# - Containers (Docker/Colima, Podman), Kubernetes (kubectl/kind/k3d/helm/k9s/tilt/flux)
# - IaC (Terraform, Packer), Policy/Supply Chain (OPA, Conftest, cosign, Trivy, Syft, Grype, Checkov, tfsec, hadolint, dive)
# - Git tooling (gh, git-lfs, pre-commit, delta)
# - Secrets & crypto (age, sops, gpg, 1Password CLI optional)
# - Networking/HTTP (curlie/httpie/mitmproxy/dnsutils/aria2)
# - Text/UI CLIs (fzf, ripgrep, fd, bat, eza, dust, duf, tldr, glow), tmux, starship
# - Observability (stern, hey, vegeta, k6), JSON/YAML (jq,yq), protobuf, grpcurl
# - Databases & data (psql/sqlite/mysql/redis CLIs; duckdb; minio client; pgcli/mycli)
# - Desktop tools (VS Code, Docker Desktop, DBeaver CE) [macOS casks]
# - Optional: asdf, sdkman for multi-runtime mgmt; Homebrew on Linux if desired
#
# Usage:
#   bash bootstrap_wide.sh                # default profile=all
#   PROFILE=minimal bash bootstrap_wide.sh
#   PROFILE=data,cloud bash bootstrap_wide.sh
#   NO_DESKTOP=1 bash bootstrap_wide.sh   # skip GUI/cask items
#   NO_DOCKER=1  bash bootstrap_wide.sh   # skip Docker Desktop/Engine
#   NO_PODMAN=1  bash bootstrap_wide.sh
#   NO_LANGS=1   bash bootstrap_wide.sh   # skip language runtimes
#
# Safe to re-run; it’s idempotent-ish. Requires sudo on Linux for system installs.
# -----------------------------------------------------------------------------

set -euo pipefail

need() { command -v "$1" &>/dev/null; }
has()  { need "$@"; }
log()  { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m!\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m✗ %s\033[0m\n" "$*"; }

OS="$(uname -s)"
ARCH="$(uname -m)"
PROFILE="${PROFILE:-all}"
NO_DESKTOP="${NO_DESKTOP:-0}"
NO_DOCKER="${NO_DOCKER:-0}"
NO_PODMAN="${NO_PODMAN:-0}"
NO_LANGS="${NO_LANGS:-0}"

SUDO=""
PKG=""
INSTALL=""

case "$OS" in
  Darwin)
    PKG="brew"
    if ! has brew; then
      log "Installing Homebrew…"
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      eval "$(/opt/homebrew/bin/brew shellenv || true)"
      eval "$(/usr/local/bin/brew shellenv || true)"
    fi
    brew update
    INSTALL="brew install"
    ;;
  Linux)
    if has apt-get; then
      PKG="apt"
      SUDO="$(sudo -n true 2>/dev/null && echo sudo || echo sudo)"
      $SUDO apt-get update -y
      $SUDO apt-get install -y ca-certificates curl wget gnupg lsb-release software-properties-common apt-transport-https
      $SUDO apt-get install -y build-essential pkg-config unzip zip tar
      INSTALL="$SUDO apt-get install -y"
    else
      err "This script supports macOS (Homebrew) and Ubuntu/Debian (apt)."
      exit 1
    fi
    ;;
  *) err "Unsupported OS: $OS"; exit 1 ;;
esac

install_pkg() {
  local bin="$1"; shift
  if has "$bin"; then ok "$bin already installed"; return 0; fi
  if [ "$PKG" = "brew" ]; then
    brew list --formula "$1" &>/dev/null || brew install "$@"
  else
    $INSTALL "$@"
  fi
  has "$bin" && ok "installed $bin" || { err "failed to install $bin"; exit 1; }
}

install_cask() {
  local name="$1"
  [ "$PKG" = "brew" ] || return 0
  [ "$NO_DESKTOP" = "1" ] && return 0
  brew list --cask "$name" &>/dev/null || brew install --cask "$name" || true
}

add_repo_apt() {
  local list_path="$1" gpg_url="$2" repo_line="$3" gpg_dst="$4"
  curl -fsSL "$gpg_url" | $SUDO gpg --dearmor -o "$gpg_dst"
  echo "$repo_line" | $SUDO tee "$list_path" >/dev/null
  $SUDO apt-get update -y
}

enable_shell_hook() {
  local line="$1"
  local shells=(bash zsh)
  for sh in "${shells[@]}"; do
    local rc="$HOME/.${sh}rc"
    grep -qsF "$line" "$rc" 2>/dev/null || echo "$line" >> "$rc"
  done
}

# ---------- Profiles ----------
want() {
  # PROFILE is comma-separated or 'all'/'minimal'
  local tag="$1"
  case "$PROFILE" in
    all|"") return 0 ;;
    minimal) [[ "$tag" =~ ^(core|git|qol)$ ]] && return 0 || return 1 ;;
    *)
      IFS=',' read -r -a arr <<<"$PROFILE"
      for p in "${arr[@]}"; do [ "$p" = "$tag" ] && return 0; done
      return 1
      ;;
  esac
}

# ---------- CORE ----------
log "Installing core CLI & QoL…"
if [ "$PKG" = "brew" ]; then
  install_pkg git git
  install_pkg jq jq
  install_pkg yq yq
  install_pkg fzf fzf
  install_pkg ripgrep ripgrep
  install_pkg fd fd
  install_pkg bat bat
  install_pkg eza eza
  install_pkg duf duf
  install_pkg dust dust
  install_pkg tldr tldr
  install_pkg glow glow
  install_pkg tmux tmux
  install_pkg starship starship
  install_pkg gh gh
  install_pkg git-delta git-delta
  install_pkg gpg gpg
  install_pkg age age
  install_pkg sops sops
  install_pkg protobuf protobuf
  install_pkg grpcurl grpcurl
  install_pkg http https://github.com || brew install httpie || true
  install_pkg curlie curlie
  install_pkg aria2 aria2
  install_pkg ipcalc ipcalc
  install_pkg watch watch
  install_pkg tree tree
  install_pkg direnv direnv
else
  install_pkg git git
  install_pkg jq jq
  install_pkg yq yq
  install_pkg fzf fzf
  install_pkg ripgrep ripgrep
  install_pkg fd fd-find
  install_pkg bat bat
  install_pkg duf duf
  install_pkg dust dust
  install_pkg tldr tldr
  install_pkg glow glow
  install_pkg tmux tmux
  install_pkg gnupg gnupg
  install_pkg age age
  install_pkg sops sops
  install_pkg protobuf-compiler protobuf-compiler
  install_pkg grpcurl grpcurl
  install_pkg httpie httpie
  install_pkg curlie curlie || true
  install_pkg aria2 aria2
  install_pkg ipcalc ipcalc
  install_pkg watch procps
  install_pkg tree tree
  install_pkg direnv direnv
  # delta, eza may be in backports/universe
  $SUDO apt-get install -y git-delta || true
  $SUDO apt-get install -y eza || $SUDO snap install eza --classic || true
  # gh (GitHub CLI)
  if ! has gh; then
    type -p apt-add-repository >/dev/null || $SUDO apt-get install -y software-properties-common
    $SUDO apt-add-repository -y ppa:git-core/ppa || true
    type -p gh >/dev/null || (type -p snap && sudo snap install gh --classic) || true
  fi
fi

# direnv + starship hooks
enable_shell_hook 'eval "$(direnv hook bash)"'
enable_shell_hook 'eval "$(direnv hook zsh)"'
enable_shell_hook 'eval "$(starship init bash)"'
enable_shell_hook 'eval "$(starship init zsh)"'
git config --global init.defaultBranch main || true
git config --global pull.rebase false || true
git config --global core.pager "delta" || true

# ---------- DESKTOP TOOLS (macOS) ----------
if [ "$PKG" = "brew" ] && [ "$NO_DESKTOP" != "1" ]; then
  log "Installing desktop apps (macOS)…"
  install_cask visual-studio-code
  install_cask dbeaver-community
  [ "$NO_DOCKER" = "1" ] || install_cask docker
fi

# ---------- CONTAINERS ----------
if [ "$NO_DOCKER" != "1" ]; then
  log "Installing Docker (Engine/Desktop/CLI)…"
  if [ "$PKG" = "brew" ]; then
    brew install docker docker-buildx docker-compose || true
    # Desktop provides runtime on macOS; Colima as lightweight alternative
    brew install colima || true
    ok "Tip: start Colima with: colima start --cpu 4 --memory 8 --disk 60 --vm-type vz"
  else
    if ! has docker; then
      $SUDO install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") \
        $(. /etc/os-release; echo "$VERSION_CODENAME") stable" | \
        $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
      $SUDO apt-get update -y
      $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      $SUDO usermod -aG docker "$USER" || true
      warn "Log out/in or run 'newgrp docker' to use Docker without sudo."
    else ok "docker already installed"; fi
  fi
fi

if [ "$NO_PODMAN" != "1" ]; then
  log "Installing Podman…"
  if [ "$PKG" = "brew" ]; then brew install podman podman-compose || true
  else $SUDO apt-get install -y podman podman-compose || true
  fi
fi

# Container utilities
log "Installing container utilities…"
if [ "$PKG" = "brew" ]; then
  install_pkg dive dive
  install_pkg hadolint hadolint
else
  install_pkg dive dive || true
  install_pkg hadolint hadolint || true
fi

# ---------- KUBERNETES ----------
log "Installing Kubernetes toolchain…"
if [ "$PKG" = "brew" ]; then
  install_pkg kubectl kubectl
  install_pkg kind kind
  install_pkg k3d k3d
  install_pkg helm helm
  install_pkg k9s k9s
  install_pkg kubectx kubectx
  install_pkg kubens kubernetes-cli || brew install kubectx
  install_pkg kustomize kustomize
  install_pkg tilt tilt
  install_pkg flux fluxcd/tap/flux || true
  install_pkg stern stern
else
  # kubectl
  if ! has kubectl; then
    curl -fsSLo kubectl "https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl"
    chmod +x kubectl && $SUDO mv kubectl /usr/local/bin/
  fi
  # kind
  if ! has kind; then
    curl -fsSLo kind https://kind.sigs.k8s.io/dl/v0.23.0/kind-linux-amd64
    chmod +x kind && $SUDO mv kind /usr/local/bin/
  fi
  # k3d
  if ! has k3d; then
    curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | $SUDO bash
  fi
  # helm
  if ! has helm; then curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash; fi
  # k9s
  if ! has k9s; then
    K9S_VER="v0.32.5"
    curl -fsSLO "https://github.com/derailed/k9s/releases/download/${K9S_VER}/k9s_Linux_amd64.tar.gz"
    tar xzf k9s_Linux_amd64.tar.gz k9s && $SUDO mv k9s /usr/local/bin/ && rm k9s_Linux_amd64.tar.gz
  fi
  # kustomize
  if ! has kustomize; then
    curl -fsSL https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh | bash
    $SUDO mv kustomize /usr/local/bin/
  fi
  # stern
  if ! has stern; then
    curl -fsSLo stern.tgz https://github.com/stern/stern/releases/latest/download/stern_$(uname -s)_amd64.tar.gz
    tar xzf stern.tgz stern && $SUDO mv stern /usr/local/bin/ && rm stern.tgz
  fi
  # tilt
  if ! has tilt; then curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash; fi
  # flux
  if ! has flux; then curl -s https://fluxcd.io/install.sh | $SUDO bash; fi
  # kubectx/kubens
  if ! has kubectx; then $SUDO git clone https://github.com/ahmetb/kubectx /opt/kubectx || true; $SUDO ln -sf /opt/kubectx/kubectx /usr/local/bin/kubectx; $SUDO ln -sf /opt/kubectx/kubens /usr/local/bin/kubens; fi
fi

# ---------- CLOUD CLIs ----------
log "Installing cloud CLIs… (AWS, GCP, Azure)"
# AWS
if ! has aws; then
  TMP="$(mktemp -d)"
  curl -fsSLo "$TMP/awscliv2.zip" "https://awscli.amazonaws.com/awscli-exe-$( [ "$OS" = "Darwin" ] && echo mac || echo linux )-x86_64.zip"
  unzip -q "$TMP/awscliv2.zip" -d "$TMP"
  ${SUDO:-} "$TMP/aws/install" || true
  rm -rf "$TMP"
fi
# gcloud
if [ "$PKG" = "brew" ]; then brew install --cask google-cloud-sdk || brew install google-cloud-sdk || true
else
  if ! has gcloud; then
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | $SUDO tee /etc/apt/sources.list.d/google-cloud-sdk.list >/dev/null
    curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | $SUDO gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
    $SUDO apt-get update -y && $SUDO apt-get install -y google-cloud-cli
  fi
fi
# Azure
if [ "$PKG" = "brew" ]; then brew install azure-cli || true
else
  if ! has az; then curl -sL https://aka.ms/InstallAzureCLIDeb | $SUDO bash; fi
fi
# Helper tools
if [ "$PKG" = "brew" ]; then brew install aws-vault || true; else $SUDO apt-get install -y pass || true; fi

# ---------- POLICY / SUPPLY CHAIN / SECURITY ----------
log "Installing policy, security & supply-chain…"
if [ "$PKG" = "brew" ]; then
  install_pkg opa opa
  install_pkg conftest conftest
  install_pkg cosign cosign
  install_pkg trivy trivy
  install_pkg syft syft
  install_pkg grype grype
  install_pkg checkov checkov
  install_pkg tfsec tfsec
else
  install_pkg opa opa
  install_pkg conftest conftest
  if ! has cosign; then COSIGN_VER="v2.4.1"; curl -fsSLo cosign.tgz "https://github.com/sigstore/cosign/releases/download/${COSIGN_VER}/cosign-linux-amd64.tar.gz"; tar xzf cosign.tgz cosign-linux-amd64 && $SUDO mv cosign-linux-amd64 /usr/local/bin/cosign && rm cosign.tgz; fi
  if ! has trivy; then
    curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key | $SUDO gpg --dearmor -o /usr/share/keyrings/trivy.gpg
    echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb stable main" | $SUDO tee /etc/apt/sources.list.d/trivy.list >/dev/null
    $SUDO apt-get update -y && $SUDO apt-get install -y trivy
  fi
  if ! has syft; then curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | $SUDO sh -s -- -b /usr/local/bin; fi
  if ! has grype; then curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | $SUDO sh -s -- -b /usr/local/bin; fi
  pipx_bin="$(python3 -m site --user-base 2>/dev/null)/bin"
  $SUDO apt-get install -y python3-pip || true
  python3 -m pip install --user pipx || true
  "$pipx_bin/pipx" ensurepath || true
  "$pipx_bin/pipx" install checkov || python3 -m pip install --user checkov || true
  "$pipx_bin/pipx" install tfsec || true
fi
install_pkg hadolint hadolint || true
install_pkg dive dive || true

# ---------- IaC ----------
log "Installing IaC (Terraform, Packer)…"
if [ "$PKG" = "brew" ]; then
  install_pkg terraform terraform
  install_pkg packer packer
else
  if ! has terraform; then
    curl -fsSL https://apt.releases.hashicorp.com/gpg | $SUDO gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | $SUDO tee /etc/apt/sources.list.d/hashicorp.list >/dev/null
    $SUDO apt-get update -y && $SUDO apt-get install -y terraform packer
  fi
fi

# ---------- GIT TOOLING ----------
log "Installing Git helpers…"
if [ "$PKG" = "brew" ]; then
  install_pkg git-lfs git-lfs
  install_pkg pre-commit pre-commit
else
  $SUDO apt-get install -y git-lfs
  $SUDO apt-get install -y pre-commit || python3 -m pip install --user pre-commit || true
fi
git lfs install || true

# ---------- LANGUAGES & RUNTIMES ----------
if [ "$NO_LANGS" != "1" ]; then
  log "Installing languages & runtimes…"

  # Python via uv (fast Python + pip replacement)
  if ! has uv; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # shellcheck disable=SC1091
    [ -f "$HOME/.profile" ] && . "$HOME/.profile" || true
  fi
  has uv && ok "uv ready" || warn "uv not on PATH (reload shell)."
  if [ "$PKG" = "brew" ]; then brew install pre-commit || true; else $SUDO apt-get install -y python3-venv || true; fi

  # Node: nvm + LTS + pnpm + bun
  if ! has nvm; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  fi
  export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm install --lts >/dev/null || true
  nvm use --lts >/dev/null || true
  corepack enable >/dev/null 2>&1 || true
  npm i -g pnpm >/dev/null 2>&1 || true
  curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1 || true
  enable_shell_hook 'export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'

  # Go
  if ! has go; then
    if [ "$PKG" = "brew" ]; then brew install go; else $SUDO apt-get install -y golang; fi
  fi

  # Rust
  if ! has rustc; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    enable_shell_hook 'source "$HOME/.cargo/env"'
  fi

  # Java (Temurin/OpenJDK) + Maven + Gradle
  if [ "$PKG" = "brew" ]; then
    brew install temurin || brew install openjdk
    brew install maven gradle
  else
    $SUDO apt-get install -y openjdk-17-jdk maven gradle || true
  fi

  # .NET SDK
  if [ "$PKG" = "brew" ]; then brew install --cask dotnet-sdk || brew install dotnet || true
  else
    $SUDO apt-get install -y dotnet-sdk-8.0 || (wget https://packages.microsoft.com/config/ubuntu/$(. /etc/os-release; echo "$VERSION_ID")/packages-microsoft-prod.deb -O packages-microsoft-prod.deb && $SUDO dpkg -i packages-microsoft-prod.deb && $SUDO apt-get update && $SUDO apt-get install -y dotnet-sdk-8.0) || true
  fi

  # Ruby (rbenv minimal)
  if ! has rbenv; then
    if [ "$PKG" = "brew" ]; then brew install rbenv; else $SUDO apt-get install -y rbenv ruby-build; fi
    enable_shell_hook 'eval "$(rbenv init -)"'
  fi
fi

# ---------- OBSERVABILITY / LOAD ----------
log "Installing observability & load tools…"
if [ "$PKG" = "brew" ]; then
  install_pkg hey hey
  install_pkg vegeta vegeta
  install_pkg k6 k6
else
  $SUDO apt-get install -y hey || go install github.com/rakyll/hey@latest || true
  $SUDO apt-get install -y k6 || true
  go install github.com/tsenart/vegeta@latest || true
fi

# ---------- DATA & DB CLIENTS ----------
log "Installing data & database clients…"
if [ "$PKG" = "brew" ]; then
  install_pkg psql libpq
  brew link --force libpq || true
  install_pkg sqlite3 sqlite
  install_pkg mysql mysql-client || true
  install_pkg redis redis
  install_pkg duckdb duckdb
  install_pkg minio-mc minio/stable/mc || brew install minio/stable/mc || true
  install_pkg pgcli pgcli || true
  install_pkg mycli mycli || true
else
  $SUDO apt-get install -y postgresql-client sqlite3 mysql-client redis-tools
  install_pkg duckdb duckdb || true
  if ! has mc; then wget -qO- https://dl.min.io/client/mc/release/linux-amd64/mc.tar.gz | tar xz && $SUDO mv mc /usr/local/bin/; fi
  python3 -m pip install --user pgcli mycli || true
fi

# ---------- OPTIONAL MANAGERS ----------
if want toolmgr && [ "$PKG" = "brew" ]; then
  brew install asdf || true
fi

# ---------- EDITOR ENHANCEMENTS ----------
if want editor; then
  if [ "$PKG" = "brew" ]; then brew install neovim || true; else $SUDO apt-get install -y neovim || true; fi
fi

# ---------- 1Password CLI (optional, macOS) ----------
if [ "$PKG" = "brew" ] && want secrets; then
  install_cask 1password-cli
fi

# ---------- QUICK DEMOS / SANITY ----------
log "Quick sanity checks…"
cmds=(git jq yq fzf rg fd bat tmux starship gh docker kubectl kind helm k9s aws gcloud az terraform opa conftest cosign trivy syft grype pre-commit)
for c in "${cmds[@]}"; do
  if has "$c"; then ok "$c: OK"; else warn "$c: MISSING (skipped/optional)"; fi
done

# ---------- QUALITY-OF-LIFE DEFAULTS ----------
log "Shell QoL defaults…"
enable_shell_hook 'export EDITOR="nvim"'
enable_shell_hook 'alias ll="eza -lah --git"'
enable_shell_hook 'alias cat="bat -pp"'
enable_shell_hook 'alias k=kubectl'
enable_shell_hook 'complete -o default -F __start_kubectl k 2>/dev/null || true'

# ---------- VERSION SNAPSHOT ----------
log "Versions snapshot:"
(
  set +e
  for c in git docker docker compose kubectl kind k3d helm k9s aws gcloud az opa conftest cosign trivy syft grype terraform packer uv python3 node npm pnpm bun go rustc java javac dotnet jq yq fzf rg fd bat tmux starship gh kustomize tilt flux stern hey vegeta k6 psql sqlite3 redis-cli duckdb mc; do
    if has "$c"; then printf "%-12s " "$c"; ($c version || $c --version || $c -v) 2>/dev/null | head -n1; else printf "%-12s NOT FOUND\n" "$c"; fi
  done
)

log "Done. Restart your shell (or run: exec \$SHELL) to load PATH changes."
[ "$PKG" = "brew" ] && [ "$NO_DOCKER" != "1" ] && warn "On macOS, launch Docker Desktop once or start Colima (colima start) before using docker."
[ "$PKG" = "apt" ] && warn "On Linux, run 'newgrp docker' or re-login to use Docker without sudo."

# ---------- OPTIONAL: LOCAL K8s QUICKSTART ----------
cat <<'EOF'

# Quickstarts (copy/paste):
# 1) Local Kubernetes (kind):
#    kind create cluster --name dev --image kindest/node:v1.30.0
#    kubectl cluster-info && kubectl get nodes
#
# 2) Supply-chain SBOM & scan (in a repo with Dockerfile):
#    syft packages dir:. -o cyclonedx-json > sbom.json
#    grype sbom:sbom.json
#
# 3) Terraform pre-commit:
#    pre-commit install && pre-commit run --all-files
#
# 4) Colima Docker on macOS (faster than Desktop):
#    colima start --cpu 4 --memory 8 --disk 60 --vm-type vz
#
# 5) Minimal data stack with Docker:
#    docker run -d --name pg -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres:16
#    PGPASSWORD=pass psql -h 127.0.0.1 -U postgres -c '\l'
EOF
```

