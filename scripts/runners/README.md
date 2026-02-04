# Summit Self-Hosted Runners Management

Comprehensive tooling and documentation for managing Summit's self-hosted GitHub Actions runners infrastructure.

## 📋 Overview

This directory contains tools, scripts, and documentation for:
- **5 self-hosted runners** (2 macOS + 3 Ubuntu)
- Health monitoring and alerting
- Automated testing and verification
- Deployment automation

## 🏗️ Infrastructure

### Current Setup

| Runner Name | OS | Architecture | Status | Purpose |
|------------|-----|--------------|--------|----------|
| Brians-MacBook-Pro | macOS | ARM64 | ✅ Online | Primary development |
| summit-local-runner | macOS | ARM64 | ✅ Online | CI/CD workloads |
| summit-ubuntu-runner-1 | Ubuntu | x64 | ⏳ Pending | Integration tests |
| summit-ubuntu-runner-2 | Ubuntu | x64 | ⏳ Pending | E2E tests |
| summit-ubuntu-runner-3 | Ubuntu | x64 | ⏳ Pending | Build pipelines |

## 🚀 Quick Start

### For Ubuntu Runners (First Time Setup)

```bash
# Get the setup scripts
curl -fsSL https://gist.githubusercontent.com/BrianCLong/56ae37f8129b158f002500d1a29bd7dc/raw/setup-runner-[1|2|3].sh | bash

# Configure the runner
cd ~/actions-runner
./config.sh --url https://github.com/BrianCLong/summit --token TOKEN --name summit-ubuntu-runner-[1|2|3]

# Install as service
sudo ./svc.sh install
sudo ./svc.sh start
```

### Health Monitoring

```bash
# Run once
./scripts/runners/monitor-health.sh

# Continuous monitoring (60s intervals)
./scripts/runners/monitor-health.sh watch

# Custom interval (30s)
./scripts/runners/monitor-health.sh watch 30

# View logs
./scripts/runners/monitor-health.sh logs

# Check recent alerts
./scripts/runners/monitor-health.sh alerts
```

## 📁 Files in This Directory

### `monitor-health.sh`
Comprehensive health monitoring script with:
- ✅ Color-coded status output
- 📊 Detailed runner statistics
- 📢 Alert tracking and logging
- 🔄 Continuous monitoring mode
- 📝 Persistent logs (`~/.summit-runners-health.log`)

**Usage:**
```bash
chmod +x scripts/runners/monitor-health.sh
./scripts/runners/monitor-health.sh [once|watch|logs|alerts|clear-alerts|help]
```

## 🔗 Related Resources

### External Documentation
- **Setup Gist**: https://gist.github.com/BrianCLong/56ae37f8129b158f002500d1a29bd7dc
  - `setup-runner-1.sh` - Ubuntu Box 1 setup
  - `setup-runner-2.sh` - Ubuntu Box 2 setup
  - `setup-runner-3.sh` - Ubuntu Box 3 setup
  - `check-runners-status.sh` - Status check script
  - `README.md` - Quick start guide

- **Google Doc**: [Summit Self-Hosted Runners Setup - Ubuntu](https://docs.google.com/document/d/1UQE9eKpktfbMzDoA_sXNqv1zM4l9GPh0WRE2JrJMSXg/edit)
  - Detailed setup instructions
  - Prerequisites checklist
  - Troubleshooting guide
  - Management commands

### GitHub Workflows
- `.github/workflows/test-runners.yml` - Runner health check workflow
- `.github/workflows/ci-core.yml` - Primary CI using self-hosted runners

## 🛠️ Management

### Check Runner Status
```bash
# Via GitHub CLI
gh api repos/BrianCLong/summit/actions/runners | jq

# Via monitoring script
./scripts/runners/monitor-health.sh

# Via web interface
open https://github.com/BrianCLong/summit/actions/runners
```

### Test All Runners
```bash
# Trigger test workflow
gh workflow run test-runners.yml --repo BrianCLong/summit

# View results
gh run list --workflow=test-runners.yml --repo BrianCLong/summit
```

### Runner Service Commands (on each machine)
```bash
# Status
sudo ./svc.sh status

# Start
sudo ./svc.sh start

# Stop
sudo ./svc.sh stop

# Restart
sudo ./svc.sh stop && sudo ./svc.sh start

# View logs
journalctl -u actions.runner.BrianCLong-summit.* -f
```

## 🐛 Troubleshooting

### Runner Offline
```bash
# Check service status
sudo ./svc.sh status

# Check logs
journalctl -u actions.runner.BrianCLong-summit.* -n 50

# Restart service
sudo ./svc.sh stop
sudo ./svc.sh start
```

### Token Expired
```bash
# 1. Generate new token
#    https://github.com/BrianCLong/summit/settings/actions/runners/new

# 2. Remove old runner config
cd ~/actions-runner
./config.sh remove --token OLD_TOKEN

# 3. Reconfigure with new token
./config.sh --url https://github.com/BrianCLong/summit --token NEW_TOKEN --name RUNNER_NAME

# 4. Reinstall service
sudo ./svc.sh install
sudo ./svc.sh start
```

### Docker Issues
```bash
# Check Docker
docker --version
docker ps

# Fix permissions
sudo usermod -aG docker $USER
newgrp docker

# Restart Docker
sudo systemctl restart docker
```

### Job Stuck in Queue
```bash
# Check if runners are online
./scripts/runners/monitor-health.sh

# Check runner logs
journalctl -u actions.runner.* -f

# Cancel queued jobs if needed
gh run list --status queued --repo BrianCLong/summit
gh run cancel RUN_ID --repo BrianCLong/summit
```

## 📊 Monitoring & Alerts

### Health Check Output
```
================================================
🔍 Summit Runners Health Check
================================================
Timestamp: Wed Jan 28 10:00:00 MST 2026
Repository: BrianCLong/summit

📊 Runner Status:

  ✅ Brians-MacBook-Pro - Online (Idle) [macOS]
  ✅ summit-local-runner - Online (Idle) [macOS]
  ✅ summit-ubuntu-runner-1 - Online (Idle) [Linux]
  ✅ summit-ubuntu-runner-2 - Online (Idle) [Linux]
  ✅ summit-ubuntu-runner-3 - Online (Idle) [Linux]

================================================
📈 Summary:
================================================
Total Runners:   5/5
Online:          5
Offline:         0
Busy:            0
Idle:            5

💊 Health Status:
✅ All systems operational
```

### Alert System
- **Log file**: `~/.summit-runners-health.log`
- **Alert file**: `~/.summit-runners-alerts`
- Persistent tracking of offline events
- Timestamped entries

## 📚 Additional Documentation

- [GitHub Actions Self-Hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Runner Application](https://github.com/actions/runner)
- [Best Practices](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners#self-hosted-runner-security)

## 🤝 Contributing

When adding new runners or modifying the infrastructure:
1. Update this README
2. Update `EXPECTED_RUNNERS` in `monitor-health.sh`
3. Update test workflow matrix in `.github/workflows/test-runners.yml`
4. Update documentation in the Google Doc
5. Test monitoring with new configuration

## 📞 Support

- **GitHub Issues**: https://github.com/BrianCLong/summit/issues
- **Runners Dashboard**: https://github.com/BrianCLong/summit/actions/runners
- **Workflow Runs**: https://github.com/BrianCLong/summit/actions

---

**Last Updated**: January 28, 2026
**Maintained By**: @BrianCLong
