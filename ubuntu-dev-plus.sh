#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Ubuntu Desktop Power Pack — Debugging, Tracing, Networking, Perf, QoL
# Tested on Ubuntu 24.04 (noble). Idempotent. Requires sudo.
# ==============================================================================

# --- Basics & updates ---
sudo apt-get update -y
sudo apt-get install -y \
  build-essential cmake ninja-build pkg-config autoconf automake libtool \
  curl wget git unzip zip ca-certificates gnupg lsb-release software-properties-common \
  jq yq ripgrep fd-find fzf bat eza tree htop btop tmux lnav multitail direnv rlwrap \
  silversearcher-ag sqlite3 ncdu neofetch

# Make `bat` available as "bat" (Ubuntu names it batcat)
command -v bat >/dev/null 2>&1 || sudo update-alternatives --install /usr/bin/bat bat /usr/bin/batcat 1 || true
# If you miss the old "exa" name, add an alias that points to eza (once)
grep -q '^alias exa=eza$' "$HOME/.bashrc" || echo 'alias exa=eza' >> "$HOME/.bashrc"

# --- Kernel/perf & tracing ---
KREL="$(uname -r)"
sudo apt-get install -y \
  linux-headers-"$KREL" \
  linux-tools-common linux-tools-"$KREL" \
  perf \
  bpftrace bpfcc-tools \
  strace ltrace \
  elfutils dwarfdump binutils-dev libdw-dev libunwind-dev \
  rr valgrind gdb gdb-multiarch lldb \
  ccache patchelf

# Enable debuginfod (auto-download debug symbols in gdb/lldb/elfutils)
grep -q 'DEBUGINFOD_URLS=' "$HOME/.bashrc" || echo 'export DEBUGINFOD_URLS="https://debuginfod.ubuntu.com"' >> "$HOME/.bashrc"
export DEBUGINFOD_URLS="https://debuginfod.ubuntu.com"

# --- Networking & diagnostics ---
sudo apt-get install -y \
  iproute2 net-tools dnsutils traceroute mtr-tiny \
  iperf3 socat ncat netcat-openbsd nmap \
  tcpdump tshark
# Wireshark GUI with non-root capture enabled
echo 'wireshark-common wireshark-common/install-setuid boolean true' | sudo debconf-set-selections
sudo apt-get install -y wireshark
sudo usermod -aG wireshark "$USER" || true
# termshark (TUI over tshark)
command -v termshark >/dev/null 2>&1 || sudo snap install termshark || true

# --- Log viewers & system health ---
sudo apt-get install -y \
  sysstat iotop iftop nethogs smartmontools lm-sensors psmisc p7zip-full
sudo sensors-detect --auto || true

# --- Python toolchain (pipx avoids PEP 668) ---
sudo apt-get install -y python3 python3-venv python3-pip python3-dev pipx
pipx ensurepath
export PATH="$HOME/.local/bin:$PATH"
# Handy Python CLIs (user-isolated)
pipx install ipython         || true
pipx install ptpython        || true
pipx install debugpy         || true
pipx install ruff            || true
pipx install black           || true
pipx install mypy            || true
pipx install pip-tools       || true
pipx install httpie          || true
pipx install bandit          || true
pipx install rich-cli        || true
pipx install pytest          || true

# --- Node via nvm (Node 22 LTS; fixes npm EACCES & engines>=20) ---
if ! command -v nvm >/dev/null 2>&1; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install --lts=iron
nvm alias default 'lts/iron'
nvm use default
corepack enable || true
echo "Node: $(node -v)  npm: $(npm -v)"
# Global Node helpers
npm i -g typescript ts-node npm-check-updates zx @withgraphite/graphite-cli || true

# --- Go, Java, Rust ---
sudo apt-get install -y golang-go golang-delve
sudo apt-get install -y openjdk-17-jdk maven gradle || true
if ! command -v rustup >/dev/null 2>&1; then
  curl -fsSL https://sh.rustup.rs | sh -s -- -y
  echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> "$HOME/.bashrc"
fi
export PATH="$HOME/.cargo/bin:$PATH"
if command -v cargo >/dev/null 2>&1; then
  cargo install --locked hyperfine || true
  cargo install --locked git-delta || true
  cargo install --locked bottom    || true
  cargo install --locked procs     || true
fi

# --- Containers / K8s ---
# Podman stack (rootless alt); Docker can be added separately if you prefer
sudo apt-get install -y podman buildah skopeo || true

# kubectl (safe install)
if ! command -v kubectl >/dev/null 2>&1; then
  KUBECTL_VER="$(curl -fsSL https://dl.k8s.io/release/stable.txt)"
  curl -fsSLo /tmp/kubectl "https://dl.k8s.io/release/${KUBECTL_VER}/bin/linux/amd64/kubectl"
  sudo install -m 0755 /tmp/kubectl /usr/local/bin/kubectl && rm -f /tmp/kubectl
fi
# Helm
command -v helm >/dev/null 2>&1 || curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Extras
command -v dive  >/dev/null 2>&1 || sudo snap install dive || true
if ! command -v k9s >/dev/null 2>&1; then
  curl -fsSL https://github.com/derailed/k9s/releases/latest/download/k9s_Linux_amd64.tar.gz | sudo tar -xz -C /usr/local/bin k9s || true
fi
if ! command -v stern >/dev/null 2>&1; then
  STERN_VER="$(curl -fsSL https://api.github.com/repos/stern/stern/releases/latest | jq -r .tag_name)"
  curl -fsSLo stern.tgz "https://github.com/stern/stern/releases/download/${STERN_VER}/stern_${STERN_VER#v}_linux_amd64.tar.gz"
  sudo tar -xzf stern.tgz -C /usr/local/bin stern && rm -f stern.tgz
fi
if ! command -v kustomize >/dev/null 2>&1; then
  KUZ_VER="$(curl -fsSL https://api.github.com/repos/kubernetes-sigs/kustomize/releases/latest | jq -r .tag_name)"
  curl -fsSLo kustomize.tgz "https://github.com/kubernetes-sigs/kustomize/releases/download/${KUZ_VER}/kustomize_${KUZ_VER#kustomize/}_linux_amd64.tar.gz"
  sudo tar -xzf kustomize.tgz -C /usr/local/bin kustomize && rm -f kustomize.tgz
fi

# Supply chain & security
sudo snap install trivy               || true
sudo snap install terraform --classic || true
if ! command -v opa >/dev/null 2>&1; then
  OPA_VER="$(curl -fsSL https://api.github.com/repos/open-policy-agent/opa/releases/latest | jq -r .tag_name)"
  curl -fsSLo /tmp/opa "https://github.com/open-policy-agent/opa/releases/download/${OPA_VER}/opa_linux_amd64"
  sudo install -m 0755 /tmp/opa /usr/local/bin/opa && rm -f /tmp/opa
fi
if ! command -v conftest >/dev/null 2>&1; then
  CONF_VER="$(curl -fsSL https://api.github.com/repos/open-policy-agent/conftest/releases/latest | jq -r .tag_name)"
  curl -fsSLo conftest.tgz "https://github.com/open-policy-agent/conftest/releases/download/${CONF_VER}/conftest_${CONF_VER#v}_Linux_x86_64.tar.gz"
  sudo tar -xzf conftest.tgz -C /usr/local/bin conftest && rm -f conftest.tgz
fi
if ! command -v cosign >/dev/null 2>&1; then
  COS_VER="$(curl -fsSL https://api.github.com/repos/sigstore/cosign/releases/latest | jq -r .tag_name)"
  curl -fsSLo /tmp/cosign "https://github.com/sigstore/cosign/releases/download/${COS_VER}/cosign-linux-amd64"
  sudo install -m 0755 /tmp/cosign /usr/local/bin/cosign && rm -f /tmp/cosign
fi
command -v syft  >/dev/null 2>&1 || curl -fsSL https

