# Self-Hosted GitHub Actions Runners - Summit

This directory contains automated setup scripts for deploying GitHub Actions self-hosted runners across three dedicated computers for the Summit project.

## 🏗️ Architecture Overview

Three self-hosted runners are configured for distributed CI/CD workloads:

- **summit-runner-1** (Computer 1): Build tasks
- **summit-runner-2** (Computer 2): Test execution with matrix strategies  
- **summit-runner-3** (Computer 3): Production deployment

## 📦 Available Scripts

### Runner 1 (Build Tasks)
```bash
./scripts/setup-runner-1.sh
```
Labels: `summit-build`, `summit-test`, `summit-deploy`

### Runner 2 (Test Tasks)
```bash
./scripts/setup-runner-2.sh
```
Labels: `summit-build`, `summit-test`, `summit-deploy`

### Runner 3 (Deployment Tasks)
```bash
./scripts/setup-runner-3.sh
```
Labels: `summit-build`, `summit-test`, `summit-deploy`

## 🚀 Quick Start Installation

### Prerequisites
- Linux x64 system (Ubuntu 20.04+ recommended)
- sudo access
- curl installed
- Internet connection

### One-Command Setup

**On Computer 1:**
```bash
curl -sSL https://raw.githubusercontent.com/BrianCLong/summit/main/scripts/setup-runner-1.sh | sudo bash
```

**On Computer 2:**
```bash
curl -sSL https://raw.githubusercontent.com/BrianCLong/summit/main/scripts/setup-runner-2.sh | sudo bash
```

**On Computer 3:**
```bash
curl -sSL https://raw.githubusercontent.com/BrianCLong/summit/main/scripts/setup-runner-3.sh | sudo bash
```

## 📋 What Each Script Does

1. ✅ Downloads GitHub Actions runner v2.321.0
2. ✅ Verifies SHA-256 checksum for security
3. ✅ Extracts to /opt/actions-runner-{1,2,3}
4. ✅ Configures runner with repository
5. ✅ Installs as systemd service
6. ✅ Starts service automatically
7. ✅ Enables service on boot
8. ✅ Displays status

## 🔧 Manual Installation (Alternative)

If you prefer to download and run locally:

```bash
# Clone or download script
wget https://raw.githubusercontent.com/BrianCLong/summit/main/scripts/setup-runner-1.sh

# Make executable
chmod +x setup-runner-1.sh

# Run with sudo
sudo ./setup-runner-1.sh
```

## 🔐 Security Features

- ✅ SHA-256 checksum verification
- ✅ Runs as dedicated `runner` user (not root)
- ✅ Service isolation with systemd
- ✅ Environment variable protection
- ✅ Automatic cleanup on failures

## 📊 Verification

After installation, verify runner status:

```bash
# Check service status
sudo systemctl status actions.runner.BrianCLong-summit.summit-runner-1.service

# View logs
sudo journalctl -u actions.runner.BrianCLong-summit.summit-runner-1.service -f
```

## 🔄 Service Management

### Start
```bash
sudo systemctl start actions.runner.BrianCLong-summit.summit-runner-1.service
```

### Stop
```bash
sudo systemctl stop actions.runner.BrianCLong-summit.summit-runner-1.service
```

### Restart
```bash
sudo systemctl restart actions.runner.BrianCLong-summit.summit-runner-1.service
```

### Enable (auto-start on boot)
```bash
sudo systemctl enable actions.runner.BrianCLong-summit.summit-runner-1.service
```

### Disable
```bash
sudo systemctl disable actions.runner.BrianCLong-summit.summit-runner-1.service
```

## 🎯 Workflow Usage

In your GitHub Actions workflows, target these runners using:

```yaml
jobs:
  build:
    runs-on: self-hosted
    # Or be more specific:
    # runs-on: [self-hosted, summit-build]
```

### Example: Distributed Build/Test/Deploy
```yaml
jobs:
  build:
    runs-on: [self-hosted, summit-build]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
  
  test:
    runs-on: [self-hosted, summit-test]
    needs: build
    steps:
      - uses: actions/checkout@v4
      - run: npm test
  
  deploy:
    runs-on: [self-hosted, summit-deploy]
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
```

## 🗂️ File Locations

- **Runner directory**: `/opt/actions-runner-{1,2,3}/`
- **Service file**: `/etc/systemd/system/actions.runner.BrianCLong-summit.summit-runner-{1,2,3}.service`
- **Logs**: View with `journalctl -u actions.runner.*`

## 🧹 Uninstallation

To remove a runner:

```bash
# Stop service
sudo systemctl stop actions.runner.BrianCLong-summit.summit-runner-1.service

# Disable service
sudo systemctl disable actions.runner.BrianCLong-summit.summit-runner-1.service

# Remove runner
cd /opt/actions-runner-1
sudo ./svc.sh uninstall
sudo ./config.sh remove --token <YOUR_REMOVAL_TOKEN>

# Clean up
sudo rm -rf /opt/actions-runner-1
sudo userdel runner
```

## ⚠️ Important Notes

1. **Token Security**: The registration tokens in these scripts are single-use and expire. If a script fails, you'll need to regenerate the token at:
   https://github.com/BrianCLong/summit/settings/actions/runners/new

2. **Updates**: To update runners, uninstall old version and run setup script again with new token.

3. **Monitoring**: Check runner status in GitHub: Settings → Actions → Runners

4. **Firewall**: Ensure runners can reach `github.com` and `api.github.com` (port 443)

## 🐛 Troubleshooting

### Runner not appearing in GitHub
- Check service status: `sudo systemctl status actions.runner.*`
- Verify internet connectivity
- Regenerate token if expired
- Check logs: `sudo journalctl -u actions.runner.* -n 100`

### Service fails to start
- Verify permissions: `ls -la /opt/actions-runner-1`
- Check if port is already in use
- Review systemd journal: `sudo journalctl -xe`

### Jobs not picking up runner
- Verify runner is "Idle" in GitHub UI
- Check workflow syntax: `runs-on: self-hosted`
- Ensure labels match if using specific labels

## 📚 Related Files

- Example workflow: `.github/workflows/self-hosted-runners-example.yml`
- Migrated workflow: `.github/workflows/agent-guardrails.yml`

## 🔗 Resources

- [GitHub Self-Hosted Runners Documentation](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Runner Releases](https://github.com/actions/runner/releases)
- [Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

## 💡 Tips

- **Parallel Execution**: With 3 runners, you can execute up to 3 jobs simultaneously
- **Resource Isolation**: Each runner runs on dedicated hardware for consistent performance
- **Cost Optimization**: No GitHub-hosted runner minutes consumed
- **Custom Environment**: Install any tools/dependencies needed for your builds

---

**Status**: ✅ All scripts tested and verified
**Last Updated**: January 27, 2026
**Maintained by**: BrianCLong
