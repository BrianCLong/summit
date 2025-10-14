#!/usr/bin/env bash
set -euo pipefail

### ----------------------------------------
### Topicality "Everything You’ll Actually Use" Bootstrap
### Supports: macOS (brew) and Ubuntu/Debian (apt)
### ----------------------------------------

need() { command -v "$1" &>/dev/null; }
has_sudo() { sudo -n true 2>/dev/null; }
log() { printf "\n\033[1;34m▶ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
warn(){ printf "\033[1;33m!\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m✗ %s\033[0m\n" "$*"; }

OS="$(uname -s)"
PKG=""
INSTALL=""
SUDO=""

case "$OS" in
  Darwin)
    PKG="brew"
    INSTALL="brew install"
    if ! need brew; then
      log "Installing Homebrew…"
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      eval "$(/opt/homebrew/bin/brew shellenv || true)"
      eval "$(/usr/local/bin/brew shellenv || true)"
    fi
    ;;
  Linux)
    if need apt-get; then
      PKG="apt"
      SUDO="$(has_sudo && echo sudo || echo "")"
      INSTALL="$SUDO apt-get install -y"
      log "Updating apt and installing base deps…"
      $SUDO apt-get update -y
      $INSTALL ca-certificates curl wget gnupg lsb-release software-properties-common apt-transport-https
      $INSTALL build-essential pkg-config unzip tar
    else
      err "This script currently supports Debian/Ubuntu (apt) and macOS (brew)."
      exit 1
    fi
    ;;
  *)
    err "Unsupported OS: $OS"
    exit 1
    ;;
esac

### Helpers
install_pkg() {
  local name="$1"; shift
  if need "$name"; then ok "$name already installed"; return 0; fi
  if [ "$PKG" = "brew" ]; then
    $INSTALL "$@" >/dev/null || $INSTALL "$@"
  else
    $INSTALL "$@" >/dev/null || $INSTALL "$@"
  fi
  need "$name" && ok "installed $name" || { err "failed to install $name"; exit 1; }
}

### Core CLI & Build
log "Installing core CLI tools…"
if [ "$PKG" = "brew" ]; then
  brew update
  install_pkg git git
  install_pkg jq jq
  install_pkg yq yq
  install_pkg direnv direnv
  install_pkg gh gh
  install_pkg gnu-tar gnu-tar
  install_pkg gnu-sed gnu-sed
else
  install_pkg git git
  install_pkg jq jq
  install_pkg yq yq
  install_pkg direnv direnv
  install_pkg gh gh
fi

### Docker Engine / Desktop
log "Installing Docker…"
if [ "$PKG" = "brew" ]; then
  # CLI + Desktop cask (Desktop provides a nicer UX on macOS)
  brew install --cask docker || true
  brew install docker docker-compose || true
  ok "If Docker Desktop didn't auto-start, launch it once to finalize."
else
  if ! need docker; then
    $SUDO install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") \
      $(. /etc/os-release; echo "$VERSION_CODENAME") stable" | \
      $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
    $SUDO apt-get update -y
    $INSTALL docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    $SUDO usermod -aG docker "$USER" || true
    warn "Log out/in or run 'newgrp docker' to use Docker without sudo."
  else ok "docker already installed"; fi
fi

### Kubernetes Tooling: kubectl, kind, helm, k9s
log "Installing Kubernetes toolchain…"
if [ "$PKG" = "brew" ]; then
  install_pkg kubectl kubectl
  install_pkg kind kind
  install_pkg helm helm
  install_pkg k9s k9s
else
  # kubectl
  if ! need kubectl; then
    curl -fsSLo kubectl "https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl"
    chmod +x kubectl && $SUDO mv kubectl /usr/local/bin/
    ok "installed kubectl"
  else ok "kubectl already installed"; fi
  # kind
  if ! need kind; then
    curl -fsSLo kind https://kind.sigs.k8s.io/dl/v0.23.0/kind-linux-amd64
    chmod +x kind && $SUDO mv kind /usr/local/bin/
    ok "installed kind"
  else ok "kind already installed"; fi
  # helm
  if ! need helm; then
    curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    ok "installed helm"
  else ok "helm already installed"; fi
  # k9s
  if ! need k9s; then
    K9S_VER="v0.32.5"
    curl -fsSLO "https://github.com/derailed/k9s/releases/download/${K9S_VER}/k9s_Linux_amd64.tar.gz"
    tar xzf k9s_Linux_amd64.tar.gz k9s && $SUDO mv k9s /usr/local/bin/ && rm k9s_Linux_amd64.tar.gz
    ok "installed k9s"
  else ok "k9s already installed"; fi
fi

### Cloud CLIs: AWS, GCP, Azure
log "Installing cloud CLIs…"
# AWS
if ! need aws; then
  TMP="$(mktemp -d)"
  curl -fsSLo "$TMP/awscliv2.zip" "https://awscli.amazonaws.com/awscli-exe-$( [ "$OS" = "Darwin" ] && echo mac || echo linux )-x86_64.zip"
  unzip -q "$TMP/awscliv2.zip" -d "$TMP"
  $SUDO "$TMP/aws/install" || true
  rm -rf "$TMP"
  need aws && ok "installed aws" || warn "aws install skipped/failed"
else ok "aws already installed"; fi
# gcloud
if [ "$PKG" = "brew" ]; then
  install_pkg gcloud google-cloud-sdk
else
  if ! need gcloud; then
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | $SUDO tee /etc/apt/sources.list.d/google-cloud-sdk.list >/dev/null
    curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | $SUDO gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
    $SUDO apt-get update -y && $INSTALL google-cloud-cli
    ok "installed gcloud"
  else ok "gcloud already installed"; fi
fi
# Azure
if [ "$PKG" = "brew" ]; then
  install_pkg az azure-cli
else
  if ! need az; then
    curl -sL https://aka.ms/InstallAzureCLIDeb | $SUDO bash
    ok "installed az"
  else ok "az already installed"; fi
fi

### Policy & Supply-chain: OPA, Conftest, cosign, Trivy, Syft, Grype
log "Installing policy & supply-chain tooling…"
if [ "$PKG" = "brew" ]; then
  install_pkg opa opa
  install_pkg conftest conftest
  install_pkg cosign cosign
  install_pkg trivy trivy
  install_pkg syft syft
  install_pkg grype grype
else
  install_pkg opa opa
  install_pkg conftest conftest
  # cosign
  if ! need cosign; then
    COSIGN_VER="v2.4.1"
    curl -fsSLo cosign.tgz "https://github.com/sigstore/cosign/releases/download/${COSIGN_VER}/cosign-linux-amd64.tar.gz"
    tar xzf cosign.tgz cosign-linux-amd64 && $SUDO mv cosign-linux-amd64 /usr/local/bin/cosign && rm cosign.tgz
    ok "installed cosign"
  else ok "cosign already installed"; fi
  # trivy
  if ! need trivy; then
    curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key | $SUDO gpg --dearmor -o /usr/share/keyrings/trivy.gpg
    echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb stable main" | $SUDO tee /etc/apt/sources.list.d/trivy.list >/dev/null
    $SUDO apt-get update -y && $INSTALL trivy
  else ok "trivy already installed"; fi
  # syft & grype
  if ! need syft; then curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | $SUDO sh -s -- -b /usr/local/bin; ok "installed syft"; else ok "syft already installed"; fi
  if ! need grype; then curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | $SUDO sh -s -- -b /usr/local/bin; ok "installed grype"; else ok "grype already installed"; fi
fi

### IaC: Terraform
log "Installing Terraform…"
if [ "$PKG" = "brew" ]; then
  install_pkg terraform terraform
else
  if ! need terraform; then
    curl -fsSL https://apt.releases.hashicorp.com/gpg | $SUDO gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | $SUDO tee /etc/apt/sources.list.d/hashicorp.list >/dev/null
    $SUDO apt-get update -y && $INSTALL terraform
  else ok "terraform already installed"; fi
fi

### Python: uv (fast Pythons + pip replacement) + pre-commit
log "Installing Python toolchain (uv) & pre-commit…"
if ! need uv; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  # shellcheck disable=SC1091
  [ -f "$HOME/.profile" ] && source "$HOME/.profile" || true
fi
need uv && ok "uv ready" || warn "uv not found on PATH (reload your shell)."
if [ "$PKG" = "brew" ]; then brew install pre-commit || true; else $INSTALL pre-commit || true; fi

### Node.js: nvm + LTS, pnpm, bun
log "Installing Node runtimes & package managers…"
if ! need nvm; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1090
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi
# ensure nvm loaded
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install --lts >/dev/null
nvm use --lts >/dev/null
corepack enable >/dev/null 2>&1 || true
npm i -g pnpm >/dev/null 2>&1 || true
curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1 || true
ok "Node LTS, pnpm, bun installed (reload shell to use bun)."

### Quality-of-life
log "QoL: direnv hook & git defaults…"
SHELL_NAME="$(basename "${SHELL:-bash}")"
DIRENV_LINE='eval "$(direnv hook '"$SHELL_NAME"')"'
if ! grep -qs "$DIRENV_LINE" "$HOME/.${SHELL_NAME}rc" 2>/dev/null; then
  echo "$DIRENV_LINE" >> "$HOME/.${SHELL_NAME}rc"
  ok "added direnv hook to ~/.${SHELL_NAME}rc"
fi
git config --global init.defaultBranch main || true
git config --global pull.rebase false || true

### Final Report
log "Versions snapshot:"
(
  set +e
  for c in git docker docker compose kubectl kind helm k9s aws gcloud az opa conftest cosign trivy syft grype terraform uv python3 node npm pnpm bun jq yq direnv gh pre-commit; do
    if need "$c"; then printf "%-12s " "$c"; ($c version || $c --version || $c -v) 2>/dev/null | head -n1; else printf "%-12s NOT FOUND\n" "$c"; fi
  done
) | sed 's/^/  /'

log "Done. Restart your shell (or 'exec $SHELL') for PATH updates. For Docker on Linux: run 'newgrp docker'."

