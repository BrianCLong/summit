# Summit Dev Station

**Reproducible, security-conscious Ubuntu workstation bootstrap for Summit development.**

## Overview

The Summit Dev Station provides a one-command setup for a complete development environment on Ubuntu 22.04/24.04. It installs all required tools with pinned versions, security best practices, and idempotent behavior.

## What's Included

### Core Tools (Always Installed)

- **Build essentials**: gcc, make, git
- **CLI utilities**: curl, wget, jq, yq, ripgrep, fd-find, unzip, zip
- **Node.js toolchain**: Node.js 20.x LTS (via NodeSource), pnpm (via corepack)
- **Python toolchain**: Python 3, pip, venv, pipx
- **Docker**: Docker CE with buildx and compose plugins
- **Security tools**: pre-commit, gitleaks (secret scanning)

### Optional Tools (Toggle via Environment Variables)

- **Kubernetes tools** (`INSTALL_K8S_TOOLS=1`): kubectl, helm, k9s
- **Cloud/IaC tools** (`INSTALL_CLOUD_TOOLS=1`): terraform, packer
- **Desktop apps** (`INSTALL_DESKTOP_APPS=1`): VS Code
- **AI tools** (`INSTALL_OLLAMA=1`): Ollama (local AI model runtime)

### AI/Agent Tools (Manual Setup Required)

These tools require API keys or manual configuration:

- **Claude Code CLI**: `npm install -g @anthropic-ai/claude-code`
- **Gemini CLI**: Follow Google Cloud CLI setup
- **Codex/GitHub Copilot**: VS Code extension
- **Qwen API**: See Alibaba Cloud documentation
- **Cline**: VS Code extension (requires Anthropic/OpenAI API key)

See [AI Tools Setup](#ai-tools-setup) below for detailed instructions.

## Supported Operating Systems

- Ubuntu 22.04 LTS (Jammy)
- Ubuntu 24.04 LTS (Noble)

## Quick Start

### Option 1: Dev Container (Recommended for Teams)

**Fastest way to get started** - containerized environment with all tools and services pre-configured.

```bash
# Prerequisites: Docker Desktop + VS Code with Dev Containers extension

# Clone and open
git clone https://github.com/YourOrg/summit.git
cd summit
code .

# In VS Code: Command Palette (Cmd/Ctrl+Shift+P)
# → "Dev Containers: Reopen in Container"

# Wait ~5-10 minutes for setup, then start coding!
```

**For GitHub Codespaces** (cloud, no local install):
1. Go to repository on GitHub
2. Click "Code" → "Codespaces" → "Create codespace"
3. Wait ~10 minutes, VS Code opens in browser

See [DEVCONTAINER.md](DEVCONTAINER.md) for full guide.

### Option 2: Native Ubuntu Install

**For bare metal or VMs** - install all tools directly on Ubuntu 22.04/24.04.

```bash
# Clone the repository
git clone https://github.com/YourOrg/summit.git
cd summit

# Run bootstrap (minimal install)
sudo scripts/devstation/ubuntu/bootstrap.sh

# Or with all features
sudo INSTALL_K8S_TOOLS=1 INSTALL_CLOUD_TOOLS=1 INSTALL_DESKTOP_APPS=1 scripts/devstation/ubuntu/bootstrap.sh
```

### Post-Install Verification

```bash
# Verify all tools are installed
scripts/devstation/ubuntu/verify.sh

# Log out and back in (if docker group was added)
# Then verify docker access
docker ps
```

### Install Summit Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test
```

## Environment Variables

Control which components are installed:

| Variable | Default | Description |
|----------|---------|-------------|
| `INSTALL_DESKTOP_APPS` | `0` | Install VS Code and other GUI tools |
| `INSTALL_K8S_TOOLS` | `0` | Install kubectl, helm, k9s |
| `INSTALL_CLOUD_TOOLS` | `0` | Install terraform, packer |
| `INSTALL_OLLAMA` | `0` | Install Ollama for local AI models |
| `INSTALL_AI_CLIS` | `0` | Show instructions for AI CLI setup |
| `SKIP_DOCKER_GROUP` | `0` | Don't add user to docker group |
| `NONINTERACTIVE` | `0` | Run without prompts (for CI/CD) |

### Example: Full Installation

```bash
sudo \
  INSTALL_DESKTOP_APPS=1 \
  INSTALL_K8S_TOOLS=1 \
  INSTALL_CLOUD_TOOLS=1 \
  INSTALL_OLLAMA=1 \
  scripts/devstation/ubuntu/bootstrap.sh
```

## Version Pinning

Tool versions are defined in `scripts/devstation/ubuntu/versions.lock.json`. The bootstrap script reads this file to install specific versions where applicable.

**Current pinned versions:**
- Node.js: 20.x (LTS)
- kubectl: 1.29.0
- Helm: 3.14.0
- k9s: 0.32.4
- Terraform: 1.7.0
- Gitleaks: 8.18.2
- Packer: 1.10.0

To update versions, edit `versions.lock.json` and re-run the bootstrap script.

## Security Notes

### No Secrets in Repository

This bootstrap **does not** install or configure any secrets, API keys, or credentials. You must manually configure:

- Git credentials (`git config --global`)
- SSH keys for GitHub/GitLab
- Cloud provider credentials (AWS, GCP, Azure)
- AI API keys (Anthropic, OpenAI, etc.)

### Storing Secrets Locally

**Best practices:**

1. **SSH keys**: `~/.ssh/` with `chmod 600`
2. **Environment variables**: `~/.bashrc` or `~/.zshrc` (not committed)
3. **Cloud credentials**: `~/.aws/`, `~/.config/gcloud/`
4. **AI API keys**: Use environment variables or tool-specific config files
   - Claude Code: `~/.config/claude-code/config.json`
   - Store keys in password manager or secure vault

### Download Verification

The bootstrap script:
- Uses official repositories with GPG verification (Docker, VS Code, NodeSource)
- Downloads from official GitHub releases (yq, gitleaks, kubectl, helm, k9s)
- Verifies checksums where available (kubectl)
- Does **not** use `curl | bash` without version pinning

## AI Tools Setup

### Claude Code CLI

```bash
# Install globally via npm
npm install -g @anthropic-ai/claude-code

# Configure API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Or store in config file
mkdir -p ~/.config/claude-code
echo '{"apiKey": "sk-ant-..."}' > ~/.config/claude-code/config.json
chmod 600 ~/.config/claude-code/config.json

# Verify
claude-code --version
```

**Security**: Never commit `ANTHROPIC_API_KEY` to git. Use environment variables or secure config files.

### Gemini CLI

```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize and authenticate
gcloud init
gcloud auth application-default login

# Install Gemini CLI (if available)
# Follow Google's official instructions
```

### GitHub Copilot (via VS Code)

1. Install VS Code: `sudo INSTALL_DESKTOP_APPS=1 scripts/devstation/ubuntu/bootstrap.sh`
2. Open VS Code: `code`
3. Install extension: Search "GitHub Copilot" in Extensions
4. Sign in with GitHub account

### Ollama (Local Models)

```bash
# Install Ollama
sudo INSTALL_OLLAMA=1 scripts/devstation/ubuntu/bootstrap.sh

# Pull a model (e.g., llama2, codellama)
ollama pull llama2
ollama pull codellama

# Run model
ollama run llama2

# Serve API (accessible at http://localhost:11434)
ollama serve
```

### Cline (VS Code Extension)

1. Install Cline extension in VS Code
2. Configure with Anthropic or OpenAI API key
3. See Cline documentation for usage

## Troubleshooting

### Docker Permission Denied

**Symptom**: `docker: permission denied while trying to connect to the Docker daemon socket`

**Fix**:
```bash
# Check if user is in docker group
groups

# If not, add user and re-login
sudo usermod -aG docker $USER
# Log out and log back in
newgrp docker

# Verify
docker ps
```

### pnpm Command Not Found After Bootstrap

**Symptom**: `pnpm: command not found`

**Fix**:
```bash
# Enable corepack manually
corepack enable

# Activate pnpm
corepack prepare pnpm@latest --activate

# Verify
pnpm --version
```

### Node.js Version Issues

**Symptom**: Wrong Node.js version installed

**Fix**:
```bash
# Check installed version
node --version

# Bootstrap installs from NodeSource repo
# To change version, edit scripts/devstation/ubuntu/versions.lock.json
# Then re-run bootstrap
```

### kubectl/helm/k9s Not Found

**Symptom**: Tools not installed even after bootstrap

**Fix**:
```bash
# These are optional - you must enable them
sudo INSTALL_K8S_TOOLS=1 scripts/devstation/ubuntu/bootstrap.sh

# Verify
kubectl version --client
helm version
k9s version
```

## Idempotent Behavior

The bootstrap script can be run multiple times safely. It will:
- Skip packages already installed
- Update repositories if needed
- Preserve existing configurations
- Not re-download tools that are already present

## Verification Checklist

After bootstrap, run:

```bash
scripts/devstation/ubuntu/verify.sh
```

Expected output:
- All required tools show versions
- Docker daemon is running
- Network connectivity to key services
- Installation manifest exists

## Files

| File | Purpose |
|------|---------|
| `scripts/devstation/ubuntu/bootstrap.sh` | Main bootstrap script |
| `scripts/devstation/ubuntu/verify.sh` | Verification script |
| `scripts/devstation/ubuntu/versions.lock.json` | Version pinning manifest |
| `~/.summit-devstation-manifest.json` | Installation record (created after bootstrap) |

## Next Steps

### Choosing the Right Approach

| Approach | Best For | Setup Time | Pros | Cons |
|----------|----------|------------|------|------|
| **Dev Container** | Teams, new developers, consistency | 5-10 min | Pre-configured, portable, includes services | Requires Docker |
| **Native Install** | VMs, bare metal, customization | 10-15 min | Full control, no container overhead | Manual setup |
| **GitHub Codespaces** | Remote work, cloud-first teams | 10 min | No local setup, access anywhere | Costs ~$0.18/hour |

### For Cloud Workstations

See `infra/devstation/README.md` for:
- Dev Container setup details (VS Code + Codespaces) - **[DEVCONTAINER.md](DEVCONTAINER.md)** for full guide
- Cloud VM images (Packer templates)
- Cloud-init examples

### For Team Onboarding

1. Share this repository
2. Provide this quick start:
   ```bash
   git clone <repo>
   cd summit
   sudo scripts/devstation/ubuntu/bootstrap.sh
   scripts/devstation/ubuntu/verify.sh
   pnpm install && pnpm build
   ```
3. Assist with AI API key setup (securely)

## Contributing

To update tool versions:

1. Edit `scripts/devstation/ubuntu/versions.lock.json`
2. Test bootstrap on clean Ubuntu VM
3. Update this README if needed
4. Submit PR with changes

## Support

- **Issues**: File GitHub issue with `devstation` label
- **Questions**: Slack `#dev-experience` channel
- **Security concerns**: Email security@yourorg.com

## License

Copyright (c) 2026 Your Organization. All rights reserved.
