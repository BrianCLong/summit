#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Ubuntu Desktop Power Pack — Debugging, Tracing, Networking, Perf, QoL
# Tested on Ubuntu 24.04 (noble). Safe to re-run. Requires sudo.
# ==============================================================================

# --- Basics & updates ---
sudo apt-get update -y
sudo apt-get install -y \
  build-essential cmake ninja-build pkg-config autoconf automake libtool \
  curl wget git unzip zip ca-certificates gnupg lsb-release software-properties-common \
  jq yq ripgrep fd-find fzf bat exa tree htop btop tmux lnav multitail direnv rlwrap \
  silversearcher-ag sqlite3 ncdu neofetch

# Make `bat` available as "bat" (Ubuntu names it batcat)
command -v bat >/dev/null 2>&1 || sudo update-alternatives --install /usr/bin/bat bat /usr/bin/batcat 1 || true
# Make `exa` available as `eza` if you prefer:
command -v eza >/dev/null 2>&1 || sudo ln -sf /usr/bin/exa /usr/local/bin/eza || true

# --- Kernel/perf & tracing (powerful!) ---
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
grep -q 'DEBUGINFOD_URLS=' "$HOME/.bashrc" || {
  echo 'export DEBUGINFOD_URLS="https://debuginfod.ubuntu.com"' >> "$HOME/.bashrc"
}
export DEBUGINFOD_URLS="https://debuginfod.ubuntu.com"

# --- Networking & diagnostics ---
sudo apt-get install -y \
  iproute2 net-tools dnsutils traceroute mtr-tiny \
  iperf3 socat ncat netcat-openbsd nmap \
  tcpdump tshark # tshark via wireshark-cli, non-root capture handled below

# Wireshark (GUI) with non-root capture enabled
echo 'wireshark-common wireshark-common/install-setuid boolean true' | sudo debconf-set-selections
sudo apt-get install -y wireshark
sudo usermod -aG wireshark "$USER" || true

# Bonus: termshark (tui over tshark) via snap if available
if ! command -v termshark >/dev/null 2>&1; then
  sudo snap install termshark || true
fi

# --- Log viewers & system health ---
sudo apt-get install -y \
  sysstat iotop iftop nethogs smartmontools lm-sensors psmisc p7zip-full
sudo sensors-detect --auto || true

# --- Languages & tooling (user-scope where possible) ---
sudo apt-get install -y python3 python3-venv python3-pip python3-dev pipx
pipx ensurepath
export PATH="$HOME/.local/bin:$PATH"

# Popular Python CLIs for debugging/REPL/tooling (user-isolated via pipx)
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
# If you want pytest globally (usually per-venv, but OK via pipx):
pipx install pytest          || true

# Node via nvm (fixes npm EACCES & satisfies Node>=20 engines)
if ! command -v nvm >/dev/null 2>&1; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install --lts=iron
nvm alias default 'lts/iron'
nvm use default
corepack enable || true
echo "Node: $(node -v)  npm: $(npm -v)"

# Global Node dev helpers (user-scope)
npm i -g typescript ts-node npm-check-updates zx @withgraphite/graphite-cli || true

# Go & delve (dlv)
sudo apt-get install -y golang-go golang-delve

# Java (LTS) & Maven/Gradle
sudo apt-get install -y openjdk-17-jdk maven gradle || true

# Rust toolchain (optional but recommended; many modern tools use cargo)
if ! command -v rustup >/dev/null 2>&1; then
  curl -fsSL https://sh.rustup.rs | sh -s -- -y
  echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> "$HOME/.bashrc"
fi
export PATH="$HOME/.cargo/bin:$PATH"
# Handy Rust-based tools (install if cargo present)
if command -v cargo >/dev/null 2>&1; then
  cargo install --locked hyperfine || true         # benchmarking
  cargo install --locked git-delta || true         # better git diff
  cargo install --locked bottom    || true         # system monitor (btm)
  cargo install --locked procs     || true         # modern ps
fi

# --- Containers / K8s tooling (if not already installed) ---
# Docker Engine is often installed separately; ensure cli convenience
if ! command -v docker >/dev/null 2>&1; then
  echo "⚠️  Docker not found. Install Docker Engine first (or use Podman)."
fi
# Podman + friends (rootless alternative)
sudo apt-get install -y podman buildah skopeo || true

# kubectl (safe install)
if ! command -v kubectl >/dev/null 2>&1; then
  KUBECTL_VER="$(curl -fsSL https://dl.k8s.io/release/stable.txt)"
  curl -fsSLo /tmp/kubectl "https://dl.k8s.io/release/${KUBECTL_VER}/bin/linux/amd64/kubectl"
  sudo install -m 0755 /tmp/kubectl /usr/local/bin/kubectl && rm -f /tmp/kubectl
fi
# Helm
if ! command -v helm >/dev/null 2>&1; then
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi
# Extra container/K8s helpers
if ! command -v dive >/dev/null 2>&1; then sudo snap install dive || true; fi   # image analyzer
if ! command -v k9s  >/dev/null 2>&1; then curl -fsSL https://github.com/derailed/k9s/releases/latest/download/k9s_Linux_amd64.tar.gz | sudo tar -xz -C /usr/local/bin k9s || true; fi
if ! command -v stern >/dev/null 2>&1; then STERN_VER="$(curl -fsSL https://api.github.com/repos/stern/stern/releases/latest | jq -r .tag_name)" && curl -fsSLo stern.tgz "https://github.com/stern/stern/releases/download/${STERN_VER}/stern_${STERN_VER#v}_linux_amd64.tar.gz" && sudo tar -xzf stern.tgz -C /usr/local/bin stern && rm -f stern.tgz || true; fi
if ! command -v kustomize >/dev/null 2>&1; then KUZ_VER="$(curl -fsSL https://api.github.com/repos/kubernetes-sigs/kustomize/releases/latest | jq -r .tag_name)" && curl -fsSLo kustomize.tgz "https://github.com/kubernetes-sigs/kustomize/releases/download/${KUZ_VER}/kustomize_${KUZ_VER#kustomize/}_linux_amd64.tar.gz" && sudo tar -xzf kustomize.tgz -C /usr/local/bin kustomize && rm -f kustomize.tgz || true; fi

# Supply chain & security scanners (system-scoped, maintained channels)
sudo snap install trivy               || true
sudo snap install terraform --classic || true
# OPA, conftest, cosign, syft, grype
if ! command -v opa >/dev/null 2>&1; then
  OPA_VER="$(curl -fsSL https://api.github.com/repos/open-policy-agent/opa/releases/latest | jq -r .tag_name)"
  curl -fsSLo /tmp/opa "https://github.com/open-policy-agent/opa/releases/download/${OPA_VER}/opa_linux_amd64" && sudo install -m 0755 /tmp/opa /usr/local/bin/opa && rm -f /tmp/opa
fi
if ! command -v conftest >/dev/null 2>&1; then
  CONF_VER="$(curl -fsSL https://api.github.com/repos/open-policy-agent/conftest/releases/latest | jq -r .tag_name)"
  curl -fsSLo conftest.tgz "https://github.com/open-policy-agent/conftest/releases/download/${CONF_VER}/conftest_${CONF_VER#v}_Linux_x86_64.tar.gz" && sudo tar -xzf conftest.tgz -C /usr/local/bin conftest && rm -f conftest.tgz
fi
if ! command -v cosign >/dev/null 2>&1; then
  COS_VER="$(curl -fsSL https://api.github.com/repos/sigstore/cosign/releases/latest | jq -r .tag_name)"
  curl -fsSLo /tmp/cosign "https://github.com/sigstore/cosign/releases/download/${COS_VER}/cosign-linux-amd64" && sudo install -m 0755 /tmp/cosign /usr/local/bin/cosign && rm -f /tmp/cosign
fi
if ! command -v syft >/dev/null 2>&1; then curl -fsSL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sudo sh -s -- -b /usr/local/bin; fi
if ! command -v grype >/dev/null 2>&1; then curl -fsSL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sudo sh -s -- -b /usr/local/bin; fi
# Secrets & keys
if ! command -v sops >/dev/null 2>&1; then
  SOPS_VER="$(curl -fsSL https://api.github.com/repos/getsops/sops/releases/latest | jq -r .tag_name)"
  curl -fsSLo /tmp/sops "https://github.com/getsops/sops/releases/download/${SOPS_VER}/sops-${SOPS_VER}.linux.amd64" && sudo install -m 0755 /tmp/sops /usr/local/bin/sops && rm -f /tmp/sops
fi
if ! command -v age >/dev/null 2>&1; then
  AGE_VER="$(curl -fsSL https://api.github.com/repos/FiloSottile/age/releases/latest | jq -r .tag_name)"
  curl -fsSLo age.tgz "https://github.com/FiloSottile/age/releases/download/${AGE_VER}/age-${AGE_VER#v}-linux-amd64.tar.gz" && sudo tar -xzf age.tgz -C /usr/local/bin --strip-components=1 age/age age/age-keygen && rm -f age.tgz
fi

# --- Editors & IDEs (choose what you like) ---
# Neovim + Micro
sudo apt-get install -y neovim micro
# VS Code (snap for simplicity; replace with .deb repo if you prefer)
if ! command -v code >/dev/null 2>&1; then
  sudo snap install code --classic || true
fi
# JetBrains Toolbox (optional GUI installer)
# if ! command -v jetbrains-toolbox >/dev/null 2>&1; then
#   curl -fsSL https://data.services.jetbrains.com/products/releases?code=TBA&latest=true&type=release | jq -r '.TBA[0].downloads.linux.link' | xargs -I{} bash -lc 'curl -fsSLo /tmp/jb.tar.gz "{}"; sudo tar -xzf /tmp/jb.tar.gz -C /opt; rm -f /tmp/jb.tar.gz'
# fi

# --- Desktop niceties ---
sudo apt-get install -y gparted dconf-editor meld xclip xsel flameshot

# --- Final notes & reminders ---
echo
echo "✅ Ubuntu Power Pack installed."
echo "• Open a NEW terminal or run:  source ~/.bashrc"
echo "• You were added to the 'wireshark' group; log out/in for non-root captures."
echo "• perf/bpftrace/bcc now available. Try:"
echo "    sudo perf top    |   sudo bpftrace -l    |   sudo /usr/sbin/opensnoop-bpfcc"
echo "• Debug symbols will auto-fetch via debuginfod (gdb/lldb/elfutils)."
echo "• Node 22 LTS via nvm, Python CLIs via pipx, containers via docker/podman."

