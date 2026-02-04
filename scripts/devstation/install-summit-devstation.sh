#!/usr/bin/env bash
set -euo pipefail

# Summit Dev Station Mega-Installer
# - Installs a governed toolchain for Summit on Ubuntu
# - Supports feature flags and version pinning via tools.lock.yaml
#
# Usage:
#   bash scripts/devstation/install-summit-devstation.sh
#   INSTALL_DOCKER=1 INSTALL_CLOUD=1 INSTALL_TERRAFORM=1 INSTALL_OBSERVABILITY=1 bash scripts/devstation/install-summit-devstation.sh
#   TOOLS_LOCK=tools.lock.yaml bash scripts/devstation/install-summit-devstation.sh
#
# Notes:
# - This script installs to /usr/local/bin (root) + ~/.local/bin (user) where appropriate.
# - If you enable INSTALL_DOCKER=1, you must log out/in (or reboot) for docker group membership to apply.

# -----------------------------
# Flags (defaults)
# -----------------------------
INSTALL_BASE="${INSTALL_BASE:-1}"            # core packages, utils
INSTALL_SHELL="${INSTALL_SHELL:-1}"          # direnv, zsh, just, task, starship, zoxide
INSTALL_GIT="${INSTALL_GIT:-1}"              # git-lfs, gh, git-sizer
INSTALL_NODE_HELPERS="${INSTALL_NODE_HELPERS:-0}"  # (optional) installs nvm + node + corepack/pnpm
INSTALL_AI_CLIS="${INSTALL_AI_CLIS:-0}"      # (optional) codex, claude, gemini, qwen (if you want in one shot)

INSTALL_CI="${INSTALL_CI:-1}"                # pre-commit, actionlint, act
INSTALL_SECURITY="${INSTALL_SECURITY:-1}"    # syft, grype, trivy, cosign, gitleaks, slsa-verifier, oras, cyclonedx-cli, ossf-scorecard
INSTALL_POLICY="${INSTALL_POLICY:-1}"        # opa, conftest, regal, cue, kubeconform, kube-linter
INSTALL_K8S="${INSTALL_K8S:-1}"              # kubectl, helm, k9s, kustomize
INSTALL_K8S_LOCAL="${INSTALL_K8S_LOCAL:-0}"  # kind, k3d, minikube
INSTALL_DOCKER="${INSTALL_DOCKER:-0}"        # docker engine
INSTALL_TERRAFORM="${INSTALL_TERRAFORM:-0}"  # terraform, tflint, tfsec
INSTALL_CLOUD="${INSTALL_CLOUD:-0}"          # aws, gcloud, az
INSTALL_OBSERVABILITY="${INSTALL_OBSERVABILITY:-0}" # promtool, otelcol-contrib, otel-cli (best-effort)
INSTALL_DATA_TOOLS="${INSTALL_DATA_TOOLS:-1}"# duckdb, sqlite3, psql client, redis-tools, graphviz
INSTALL_DEV_EXTRAS="${INSTALL_DEV_EXTRAS:-1}"# ast-grep, hyperfine, hadolint, goreleaser, dyff, miller (mlr)

# -----------------------------
# Inputs
# -----------------------------
TOOLS_LOCK="${TOOLS_LOCK:-scripts/devstation/tools.lock.yaml}"

# -----------------------------
# Helpers
# -----------------------------
need_cmd() { command -v "$1" >/dev/null 2>&1; }
as_root() { if need_cmd sudo; then sudo -n true 2>/dev/null || sudo -v; sudo "$@"; else "$@"; fi; }

arch() {
  case "$(uname -m)" in
    x86_64|amd64) echo "amd64" ;;
    aarch64|arm64) echo "arm64" ;;
    *) echo "unsupported"; return 1 ;;
  esac
}

os_codename() { . /etc/os-release && echo "${VERSION_CODENAME}"; }

install_bin_from_url() {
  local url="$1" dest="$2"
  curl -fsSL "$url" -o /tmp/_dl
  as_root install -m 0755 /tmp/_dl "$dest"
  rm -f /tmp/_dl
}

install_tar_gz_single_bin() {
  local url="$1" bin="$2" dest="$3"
  curl -fsSL "$url" -o /tmp/_dl.tgz
  tar -xzf /tmp/_dl.tgz -C /tmp "$bin"
  as_root install -m 0755 "/tmp/$bin" "$dest"
  rm -f "/tmp/$bin" /tmp/_dl.tgz
}

install_zip_single_bin() {
  local url="$1" bin="$2" dest="$3"
  curl -fsSL "$url" -o /tmp/_dl.zip
  unzip -qo /tmp/_dl.zip -d /tmp
  as_root install -m 0755 "/tmp/$bin" "$dest"
  rm -f "/tmp/$bin" /tmp/_dl.zip
}

# tools.lock.yaml reader (requires yq; we bootstrap yq early)
lock_get() {
  # $1 = yq expression (e.g. '.tools.kubectl.version // "stable"')
  if [ -f "$TOOLS_LOCK" ] && need_cmd yq; then
    yq -r "$1" "$TOOLS_LOCK" 2>/dev/null || true
  fi
}

lock_tool_ver() { lock_get ".tools.$1.version // \"\""; }
lock_tool_url() { lock_get ".tools.$1.url // \"\""; }

ensure_yq() {
  if need_cmd yq; then return 0; fi
  local A; A="$(arch)"
  local url="https://github.com/mikefarah/yq/releases/latest/download/yq_linux_${A}"
  echo "Bootstrapping yq from ${url}"
  curl -fsSL "$url" -o /tmp/yq
  as_root install -m 0755 /tmp/yq /usr/local/bin/yq
  rm -f /tmp/yq
}

echo "[0] Preflight"
as_root true
export PATH="$HOME/.local/bin:$PATH"

# -----------------------------
# Base packages
# -----------------------------
if [ "$INSTALL_BASE" = "1" ]; then
  echo "[1] Base OS packages"
  as_root apt-get update -y
  as_root apt-get install -y --no-install-recommends \
    ca-certificates curl wget gnupg lsb-release \
    unzip zip tar xz-utils \
    jq \
    ripgrep fd-find fzf tmux tree \
    openssh-client \
    netcat-openbsd dnsutils iputils-ping \
    htop btop rsync \
    shellcheck \
    python3 python3-venv python3-pip pipx \
    build-essential pkg-config make \
    clang cmake \
    libssl-dev libffi-dev

  # fd (Ubuntu: fdfind)
  if ! need_cmd fd && need_cmd fdfind; then
    mkdir -p "$HOME/.local/bin"
    ln -sf "$(command -v fdfind)" "$HOME/.local/bin/fd"
  fi
  pipx ensurepath >/dev/null 2>&1 || true

  ensure_yq
fi

# -----------------------------
# Shell ergonomics
# -----------------------------
if [ "$INSTALL_SHELL" = "1" ]; then
  echo "[2] Shell ergonomics"
  as_root apt-get install -y --no-install-recommends zsh direnv bash-completion

  # just
  local_just_ver="$(lock_tool_ver just)"
  A="$(arch)"
  if [ -z "$local_just_ver" ]; then
    JUST_TAG="$(curl -fsSL https://api.github.com/repos/casey/just/releases/latest | jq -r '.tag_name')"
  else
    JUST_TAG="v${local_just_ver}"
  fi
  JUST_VER="${JUST_TAG#v}"
  case "$A" in
    amd64) JUST_ASSET="just-${JUST_VER}-x86_64-unknown-linux-musl.tar.gz" ;;
    arm64) JUST_ASSET="just-${JUST_VER}-aarch64-unknown-linux-musl.tar.gz" ;;
  esac
  install_tar_gz_single_bin "https://github.com/casey/just/releases/download/${JUST_TAG}/${JUST_ASSET}" "just" "/usr/local/bin/just"

  # task
  local_task_ver="$(lock_tool_ver task)"
  if [ -z "$local_task_ver" ]; then
    TASK_TAG="$(curl -fsSL https://api.github.com/repos/go-task/task/releases/latest | jq -r '.tag_name')"
  else
    TASK_TAG="v${local_task_ver}"
  fi
  case "$A" in
    amd64) TASK_ASSET="task_linux_amd64.tar.gz" ;;
    arm64) TASK_ASSET="task_linux_arm64.tar.gz" ;;
  esac
  install_tar_gz_single_bin "https://github.com/go-task/task/releases/download/${TASK_TAG}/${TASK_ASSET}" "task" "/usr/local/bin/task"

  # starship + zoxide (apt may be old; acceptable for workstation)
  as_root apt-get install -y --no-install-recommends starship zoxide || true
fi

# -----------------------------
# Git tooling
# -----------------------------
if [ "$INSTALL_GIT" = "1" ]; then
  echo "[3] Git tooling"
  as_root apt-get install -y --no-install-recommends git git-lfs

  # GitHub CLI
  if ! need_cmd gh; then
    as_root mkdir -p /etc/apt/keyrings
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg |
      as_root tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null
    as_root chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" |
      as_root tee /etc/apt/sources.list.d/github-cli.list >/dev/null
    as_root apt-get update -y
    as_root apt-get install -y gh
  fi

  # git-sizer (GitHub releases)
  A="$(arch)"
  GITS_TAG="$(curl -fsSL https://api.github.com/repos/github/git-sizer/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) GITS_TGZ="git-sizer-linux-amd64-${GITS_TAG#v}.tar.gz" ;;
    arm64) GITS_TGZ="git-sizer-linux-arm64-${GITS_TAG#v}.tar.gz" ;;
  esac
  curl -fsSL "https://github.com/github/git-sizer/releases/download/${GITS_TAG}/${GITS_TGZ}" -o /tmp/git-sizer.tgz
  tar -xzf /tmp/git-sizer.tgz -C /tmp
  as_root install -m 0755 /tmp/git-sizer /usr/local/bin/git-sizer
  rm -f /tmp/git-sizer /tmp/git-sizer.tgz
fi

# -----------------------------
# Optional Node + pnpm bootstrap
# -----------------------------
if [ "$INSTALL_NODE_HELPERS" = "1" ]; then
  echo "[4] Node bootstrap (nvm + Node + pnpm)"
  as_root apt-get install -y --no-install-recommends ca-certificates curl
  export NVM_DIR="$HOME/.nvm"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  fi
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
  nvm alias default 20
  corepack enable
  corepack prepare pnpm@latest --activate >/dev/null 2>&1 || true
fi

# -----------------------------
# Optional AI CLIs (if you want bundled)
# -----------------------------
if [ "$INSTALL_AI_CLIS" = "1" ]; then
  echo "[5] AI CLIs (requires npm on PATH)"
  if ! need_cmd npm; then
    echo "ERROR: npm not found. Set INSTALL_NODE_HELPERS=1 or install Node first."
    exit 1
  fi
  npm install -g --silent @openai/codex@latest
  npm install -g --silent @google/gemini-cli@latest
  npm install -g --silent @qwen-code/qwen-code@latest
  curl -fsSL https://claude.ai/install.sh | bash
fi

# -----------------------------
# CI tooling
# -----------------------------
if [ "$INSTALL_CI" = "1" ]; then
  echo "[6] CI tooling"
  pipx install pre-commit >/dev/null 2>&1 || pipx upgrade pre-commit >/dev/null 2>&1 || true

  # act
  curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/nektos/act/master/install.sh | as_root bash

  # actionlint (Go-based; install without Go by using release binary)
  A="$(arch)"
  AL_TAG="$(curl -fsSL https://api.github.com/repos/rhysd/actionlint/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) AL_TGZ="actionlint_${AL_TAG#v}_linux_amd64.tar.gz" ;;
    arm64) AL_TGZ="actionlint_${AL_TAG#v}_linux_arm64.tar.gz" ;;
  esac
  install_tar_gz_single_bin "https://github.com/rhysd/actionlint/releases/download/${AL_TAG}/${AL_TGZ}" "actionlint" "/usr/local/bin/actionlint"
fi

# -----------------------------
# Docker
# -----------------------------
if [ "$INSTALL_DOCKER" = "1" ]; then
  echo "[7] Docker Engine"
  as_root install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | as_root gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  as_root chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(os_codename) stable" |
    as_root tee /etc/apt/sources.list.d/docker.list >/dev/null
  as_root apt-get update -y
  as_root apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  as_root usermod -aG docker "$USER" || true
fi

# -----------------------------
# Kubernetes
# -----------------------------
if [ "$INSTALL_K8S" = "1" ]; then
  echo "[8] Kubernetes tooling"
  A="$(arch)"
  KVER="$(lock_tool_ver kubectl)"
  if [ -z "$KVER" ] || [ "$KVER" = "stable" ]; then
    KVER="$(curl -fsSL https://dl.k8s.io/release/stable.txt)"
  fi
  install_bin_from_url "https://dl.k8s.io/release/${KVER}/bin/linux/${A}/kubectl" "/usr/local/bin/kubectl"
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

  K9S_TAG="$(curl -fsSL https://api.github.com/repos/derailed/k9s/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) install_tar_gz_single_bin "https://github.com/derailed/k9s/releases/download/${K9S_TAG}/k9s_Linux_amd64.tar.gz" "k9s" "/usr/local/bin/k9s" ;;
    arm64) install_tar_gz_single_bin "https://github.com/derailed/k9s/releases/download/${K9S_TAG}/k9s_Linux_arm64.tar.gz" "k9s" "/usr/local/bin/k9s" ;;
  esac

  # kustomize
  KUS_TAG="$(curl -fsSL https://api.github.com/repos/kubernetes-sigs/kustomize/releases/latest | jq -r '.tag_name')"
  KUS_VER="${KUS_TAG#kustomize/}"
  case "$A" in
    amd64) KUS_ASSET="kustomize_v${KUS_VER}_linux_amd64.tar.gz" ;;
    arm64) KUS_ASSET="kustomize_v${KUS_VER}_linux_arm64.tar.gz" ;;
  esac
  install_tar_gz_single_bin "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv${KUS_VER}/${KUS_ASSET}" "kustomize" "/usr/local/bin/kustomize"
fi

if [ "$INSTALL_K8S_LOCAL" = "1" ]; then
  echo "[9] Local K8s runtimes"
  A="$(arch)"
  KIND_TAG="$(curl -fsSL https://api.github.com/repos/kubernetes-sigs/kind/releases/latest | jq -r '.tag_name')"
  install_bin_from_url "https://github.com/kubernetes-sigs/kind/releases/download/${KIND_TAG}/kind-linux-${A}" "/usr/local/bin/kind"

  K3D_TAG="$(curl -fsSL https://api.github.com/repos/k3d-io/k3d/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) install_bin_from_url "https://github.com/k3d-io/k3d/releases/download/${K3D_TAG}/k3d-linux-amd64" "/usr/local/bin/k3d" ;;
    arm64) install_bin_from_url "https://github.com/k3d-io/k3d/releases/download/${K3D_TAG}/k3d-linux-arm64" "/usr/local/bin/k3d" ;;
  esac

  case "$A" in
    amd64) install_bin_from_url "https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64" "/usr/local/bin/minikube" ;;
    arm64) install_bin_from_url "https://storage.googleapis.com/minikube/releases/latest/minikube-linux-arm64" "/usr/local/bin/minikube" ;;
  esac
fi

# -----------------------------
# Security + supply chain
# -----------------------------
if [ "$INSTALL_SECURITY" = "1" ]; then
  echo "[10] Security + supply chain"
  # Anchore
  curl -sSfL https://get.anchore.io/syft  | as_root sh -s -- -b /usr/local/bin
  curl -sSfL https://get.anchore.io/grype | as_root sh -s -- -b /usr/local/bin

  # Trivy via apt if available
  if ! need_cmd trivy; then
    if as_root apt-cache show trivy >/dev/null 2>&1; then
      as_root apt-get install -y trivy
    else
      echo "NOTE: trivy not available in apt cache on this base image; install via official repo method if required."
    fi
  fi

  # gitleaks
  A="$(arch)"
  GITL_TAG="$(curl -fsSL https://api.github.com/repos/gitleaks/gitleaks/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) GITL_TGZ="gitleaks_${GITL_TAG#v}_linux_x64.tar.gz" ;;
    arm64) GITL_TGZ="gitleaks_${GITL_TAG#v}_linux_arm64.tar.gz" ;;
  esac
  install_tar_gz_single_bin "https://github.com/gitleaks/gitleaks/releases/download/${GITL_TAG}/${GITL_TGZ}" "gitleaks" "/usr/local/bin/gitleaks"

  # cosign
  COS_TAG="$(curl -fsSL https://api.github.com/repos/sigstore/cosign/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) install_bin_from_url "https://github.com/sigstore/cosign/releases/download/${COS_TAG}/cosign-linux-amd64" "/usr/local/bin/cosign" ;;
    arm64) install_bin_from_url "https://github.com/sigstore/cosign/releases/download/${COS_TAG}/cosign-linux-arm64" "/usr/local/bin/cosign" ;;
  esac

  # slsa-verifier
  SLSA_TAG="$(curl -fsSL https://api.github.com/repos/slsa-framework/slsa-verifier/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) install_bin_from_url "https://github.com/slsa-framework/slsa-verifier/releases/download/${SLSA_TAG}/slsa-verifier-linux-amd64" "/usr/local/bin/slsa-verifier" ;;
    arm64) install_bin_from_url "https://github.com/slsa-framework/slsa-verifier/releases/download/${SLSA_TAG}/slsa-verifier-linux-arm64" "/usr/local/bin/slsa-verifier" ;;
  esac

  # oras
  ORAS_TAG="$(curl -fsSL https://api.github.com/repos/oras-project/oras/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) ORAS_TGZ="oras_${ORAS_TAG#v}_linux_amd64.tar.gz" ;;
    arm64) ORAS_TGZ="oras_${ORAS_TAG#v}_linux_arm64.tar.gz" ;;
  esac
  install_tar_gz_single_bin "https://github.com/oras-project/oras/releases/download/${ORAS_TAG}/${ORAS_TGZ}" "oras" "/usr/local/bin/oras"

  # cyclonedx-cli (requires dotnet sometimes; we install only if npm exists via node tooling)
  if need_cmd npm; then
    npm install -g --silent @cyclonedx/cyclonedx-npm@latest >/dev/null 2>&1 || true
  fi

  # ossf-scorecard
  SCORE_TAG="$(curl -fsSL https://api.github.com/repos/ossf/scorecard/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) install_bin_from_url "https://github.com/ossf/scorecard/releases/download/${SCORE_TAG}/scorecard-linux-amd64" "/usr/local/bin/scorecard" ;;
    arm64) install_bin_from_url "https://github.com/ossf/scorecard/releases/download/${SCORE_TAG}/scorecard-linux-arm64" "/usr/local/bin/scorecard" ;;
  esac
fi

# -----------------------------
# Policy tooling
# -----------------------------
if [ "$INSTALL_POLICY" = "1" ]; then
  echo "[11] Policy tooling"
  A="$(arch)"
  install_bin_from_url "https://openpolicyagent.org/downloads/latest/opa_linux_${A}" "/usr/local/bin/opa"

  CONF_TAG="$(curl -fsSL https://api.github.com/repos/open-policy-agent/conftest/releases/latest | jq -r '.tag_name')"
  case "$(uname -m)" in
    x86_64|amd64) CONF_ARCH="x86_64" ;;
    aarch64|arm64) CONF_ARCH="arm64" ;;
  esac
  CONF_VER="${CONF_TAG#v}"
  CONF_TGZ="conftest_${CONF_VER}_Linux_${CONF_ARCH}.tar.gz"
  curl -fsSL "https://github.com/open-policy-agent/conftest/releases/download/${CONF_TAG}/${CONF_TGZ}" -o /tmp/conftest.tgz
  tar -xzf /tmp/conftest.tgz -C /tmp conftest
  as_root install -m 0755 /tmp/conftest /usr/local/bin/conftest
  rm -f /tmp/conftest /tmp/conftest.tgz

  # regal (rego linter)
  REGAL_TAG="$(curl -fsSL https://api.github.com/repos/styrainc/regal/releases/latest | jq -r '.tag_name')"
  A="$(arch)"
  case "$A" in
    amd64) install_bin_from_url "https://github.com/styrainc/regal/releases/download/${REGAL_TAG}/regal_Linux_x86_64" "/usr/local/bin/regal" ;;
    arm64) install_bin_from_url "https://github.com/styrainc/regal/releases/download/${REGAL_TAG}/regal_Linux_arm64" "/usr/local/bin/regal" ;;
  esac

  # cue
  CUE_TAG="$(curl -fsSL https://api.github.com/repos/cue-lang/cue/releases/latest | jq -r '.tag_name')"
  CUE_VER="${CUE_TAG#v}"
  case "$A" in
    amd64) CUE_TGZ="cue_v${CUE_VER}_linux_amd64.tar.gz" ;;
    arm64) CUE_TGZ="cue_v${CUE_VER}_linux_arm64.tar.gz" ;;
  esac
  install_tar_gz_single_bin "https://github.com/cue-lang/cue/releases/download/${CUE_TAG}/${CUE_TGZ}" "cue" "/usr/local/bin/cue"

  # kubeconform
  KC_TAG="$(curl -fsSL https://api.github.com/repos/yannh/kubeconform/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) install_tar_gz_single_bin "https://github.com/yannh/kubeconform/releases/download/${KC_TAG}/kubeconform-linux-amd64.tar.gz" "kubeconform" "/usr/local/bin/kubeconform" ;;
    arm64) install_tar_gz_single_bin "https://github.com/yannh/kubeconform/releases/download/${KC_TAG}/kubeconform-linux-arm64.tar.gz" "kubeconform" "/usr/local/bin/kubeconform" ;;
  esac

  # kube-linter
  KL_TAG="$(curl -fsSL https://api.github.com/repos/stackrox/kube-linter/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) install_tar_gz_single_bin "https://github.com/stackrox/kube-linter/releases/download/${KL_TAG}/kube-linter-linux.tar.gz" "kube-linter" "/usr/local/bin/kube-linter" ;;
    arm64) install_tar_gz_single_bin "https://github.com/stackrox/kube-linter/releases/download/${KL_TAG}/kube-linter-linux-arm64.tar.gz" "kube-linter" "/usr/local/bin/kube-linter" ;;
  esac
fi

# -----------------------------
# Terraform + Cloud
# -----------------------------
if [ "$INSTALL_TERRAFORM" = "1" ]; then
  echo "[12] Terraform tooling"
  as_root apt-get install -y --no-install-recommends gnupg software-properties-common
  wget -qO- https://apt.releases.hashicorp.com/gpg | as_root gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" |
    as_root tee /etc/apt/sources.list.d/hashicorp.list >/dev/null
  as_root apt-get update -y
  as_root apt-get install -y terraform

  A="$(arch)"
  TFL_TAG="$(curl -fsSL https://api.github.com/repos/terraform-linters/tflint/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) install_zip_single_bin "https://github.com/terraform-linters/tflint/releases/download/${TFL_TAG}/tflint_linux_amd64.zip" "tflint" "/usr/local/bin/tflint" ;;
    arm64) install_zip_single_bin "https://github.com/terraform-linters/tflint/releases/download/${TFL_TAG}/tflint_linux_arm64.zip" "tflint" "/usr/local/bin/tflint" ;;
  esac

  TFSEC_TAG="$(curl -fsSL https://api.github.com/repos/aquasecurity/tfsec/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) install_bin_from_url "https://github.com/aquasecurity/tfsec/releases/download/${TFSEC_TAG}/tfsec-linux-amd64" "/usr/local/bin/tfsec" ;;
    arm64) install_bin_from_url "https://github.com/aquasecurity/tfsec/releases/download/${TFSEC_TAG}/tfsec-linux-arm64" "/usr/local/bin/tfsec" ;;
  esac
fi

if [ "$INSTALL_CLOUD" = "1" ]; then
  echo "[13] Cloud CLIs"
  A="$(arch)"
  # AWS CLI v2
  case "$A" in
    amd64) AWS_ZIP="awscli-exe-linux-x86_64.zip" ;;
    arm64) AWS_ZIP="awscli-exe-linux-aarch64.zip" ;;
  esac
  curl -fsSL "https://awscli.amazonaws.com/${AWS_ZIP}" -o /tmp/awscliv2.zip
  unzip -qo /tmp/awscliv2.zip -d /tmp
  as_root /tmp/aws/install --update
  rm -rf /tmp/aws /tmp/awscliv2.zip

  # gcloud
  if ! need_cmd gcloud; then
    as_root apt-get install -y apt-transport-https
    curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | as_root gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" |
      as_root tee /etc/apt/sources.list.d/google-cloud-sdk.list >/dev/null
    as_root apt-get update -y
    as_root apt-get install -y google-cloud-cli
  fi

  # az
  if ! need_cmd az; then
    curl -fsSL https://aka.ms/InstallAzureCLIDeb | as_root bash
  fi
fi

# -----------------------------
# Observability (best-effort)
# -----------------------------
if [ "$INSTALL_OBSERVABILITY" = "1" ]; then
  echo "[14] Observability tooling"
  A="$(arch)"

  # Prometheus promtool
  PROM_TAG="$(curl -fsSL https://api.github.com/repos/prometheus/prometheus/releases/latest | jq -r '.tag_name')"
  PROM_VER="${PROM_TAG#v}"
  case "$A" in
    amd64) PROM_TGZ="prometheus-${PROM_VER}.linux-amd64.tar.gz" ;;
    arm64) PROM_TGZ="prometheus-${PROM_VER}.linux-arm64.tar.gz" ;;
  esac
  curl -fsSL "https://github.com/prometheus/prometheus/releases/download/${PROM_TAG}/${PROM_TGZ}" -o /tmp/prom.tgz
  tar -xzf /tmp/prom.tgz -C /tmp
  as_root install -m 0755 "/tmp/prometheus-${PROM_VER}.linux-${A}/promtool" /usr/local/bin/promtool
  rm -rf /tmp/prom.tgz "/tmp/prometheus-${PROM_VER}.linux-${A}"

  # OTEL collector contrib (asset naming can vary by release; attempt common convention)
  OTEL_TAG="$(curl -fsSL https://api.github.com/repos/open-telemetry/opentelemetry-collector-releases/releases/latest | jq -r '.tag_name')"
  OTEL_VER="${OTEL_TAG#v}"
  case "$A" in
    amd64) OTEL_TGZ="otelcol-contrib_${OTEL_VER}_linux_amd64.tar.gz" ;;
    arm64) OTEL_TGZ="otelcol-contrib_${OTEL_VER}_linux_arm64.tar.gz" ;;
  esac
  if curl -fsSL "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/${OTEL_TAG}/${OTEL_TGZ}" -o /tmp/otel.tgz; then
    tar -xzf /tmp/otel.tgz -C /tmp otelcol-contrib || true
    if [ -f /tmp/otelcol-contrib ]; then
      as_root install -m 0755 /tmp/otelcol-contrib /usr/local/bin/otelcol-contrib
      rm -f /tmp/otelcol-contrib
    fi
    rm -f /tmp/otel.tgz
  else
    echo "NOTE: Could not fetch otelcol-contrib asset for ${OTEL_TAG}; install manually if needed."
  fi
fi

# -----------------------------
# Data tools
# -----------------------------
if [ "$INSTALL_DATA_TOOLS" = "1" ]; then
  echo "[15] Data tools"
  as_root apt-get install -y --no-install-recommends \
    sqlite3 \
    postgresql-client \
    redis-tools \
    graphviz
  # duckdb (apt may not have; install from GitHub releases)
  DUCK_TAG="$(curl -fsSL https://api.github.com/repos/duckdb/duckdb/releases/latest | jq -r '.tag_name')"
  A="$(arch)"
  case "$A" in
    amd64) DUCK_ZIP="duckdb_cli-linux-amd64.zip" ;;
    arm64) DUCK_ZIP="duckdb_cli-linux-arm64.zip" ;;
  esac
  curl -fsSL "https://github.com/duckdb/duckdb/releases/download/${DUCK_TAG}/${DUCK_ZIP}" -o /tmp/duckdb.zip
  unzip -qo /tmp/duckdb.zip -d /tmp
  as_root install -m 0755 /tmp/duckdb /usr/local/bin/duckdb
  rm -f /tmp/duckdb /tmp/duckdb.zip
fi

# -----------------------------
# Dev extras
# -----------------------------
if [ "$INSTALL_DEV_EXTRAS" = "1" ]; then
  echo "[16] Dev extras"
  # hadolint
  HAD_TAG="$(curl -fsSL https://api.github.com/repos/hadolint/hadolint/releases/latest | jq -r '.tag_name')"
  A="$(arch)"
  case "$A" in
    amd64) install_bin_from_url "https://github.com/hadolint/hadolint/releases/download/${HAD_TAG}/hadolint-Linux-x86_64" "/usr/local/bin/hadolint" ;;
    arm64) install_bin_from_url "https://github.com/hadolint/hadolint/releases/download/${HAD_TAG}/hadolint-Linux-aarch64" "/usr/local/bin/hadolint" ;;
  esac

  # goreleaser
  GOREL_TAG="$(curl -fsSL https://api.github.com/repos/goreleaser/goreleaser/releases/latest | jq -r '.tag_name')"
  case "$(uname -m)" in
    x86_64|amd64) GOREL_TGZ="goreleaser_Linux_x86_64.tar.gz" ;;
    aarch64|arm64) GOREL_TGZ="goreleaser_Linux_arm64.tar.gz" ;;
  esac
  install_tar_gz_single_bin "https://github.com/goreleaser/goreleaser/releases/download/${GOREL_TAG}/${GOREL_TGZ}" "goreleaser" "/usr/local/bin/goreleaser"

  # dyff (semantic yaml diff)
  DYFF_TAG="$(curl -fsSL https://api.github.com/repos/homeport/dyff/releases/latest | jq -r '.tag_name')"
  A="$(arch)"
  case "$A" in
    amd64) DYFF_TGZ="dyff_${DYFF_TAG#v}_linux_amd64.tar.gz" ;;
    arm64) DYFF_TGZ="dyff_${DYFF_TAG#v}_linux_arm64.tar.gz" ;;
  esac
  install_tar_gz_single_bin "https://github.com/homeport/dyff/releases/download/${DYFF_TAG}/${DYFF_TGZ}" "dyff" "/usr/local/bin/dyff"

  # miller (mlr)
  MLR_TAG="$(curl -fsSL https://api.github.com/repos/johnkerl/miller/releases/latest | jq -r '.tag_name')"
  case "$A" in
    amd64) install_bin_from_url "https://github.com/johnkerl/miller/releases/download/${MLR_TAG}/mlr-linux-amd64" "/usr/local/bin/mlr" ;;
    arm64) install_bin_from_url "https://github.com/johnkerl/miller/releases/download/${MLR_TAG}/mlr-linux-arm64" "/usr/local/bin/mlr" ;;
  esac

  # ast-grep (structural search)
  SG_TAG="$(curl -fsSL https://api.github.com/repos/ast-grep/ast-grep/releases/latest | jq -r '.tag_name')"
  A="$(arch)"
  case "$A" in
    amd64) install_bin_from_url "https://github.com/ast-grep/ast-grep/releases/download/${SG_TAG}/sg-x86_64-unknown-linux-gnu" "/usr/local/bin/sg" ;;
    arm64) install_bin_from_url "https://github.com/ast-grep/ast-grep/releases/download/${SG_TAG}/sg-aarch64-unknown-linux-gnu" "/usr/local/bin/sg" ;;
  esac

  # hyperfine (apt)
  as_root apt-get install -y --no-install-recommends hyperfine || true
fi

echo "[17] Done"
echo "Recommended next:"
echo "  - Run: scripts/devstation/verify-tools.sh --lock \"$TOOLS_LOCK\" --out devstation.evidence.json"
echo "  - Commit evidence for reproducibility when appropriate."
