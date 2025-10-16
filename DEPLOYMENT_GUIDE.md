# 🚀 Summit Deployment Guide - v2025.09.21-mega-merge

## ✅ DEPLOYMENT STATUS: READY FOR PRODUCTION

This guide provides complete instructions for deploying the Summit IntelGraph platform to your infrastructure.

## 📦 What's Included

### 🏗️ Infrastructure

- **MCP Core Server** - Complete Model Context Protocol implementation
- **Maestro Conductor UI** - Enterprise-grade interface framework
- **AI/ML Upgrades** - torch 2.8.0, transformers 4.53.0, advanced simulation
- **Enterprise Tooling** - 1,000+ files of production infrastructure

### 🚀 Deployment Assets

- Multi-environment deployment scripts (`scripts/deploy-now.sh`)
- Docker containerization with health checks
- Environment-specific configurations (dev/stage/prod)
- Automated rollback capabilities

## 🎯 Target Environments

| Environment | Hosts                                                          | Purpose                   |
| ----------- | -------------------------------------------------------------- | ------------------------- |
| **DEV**     | `intelgraph-dev.topicality.co`<br/>`maestro-dev.topicality.co` | Development testing       |
| **STAGE**   | `stage.topicality.co`                                          | Pre-production validation |
| **PROD**    | `prod.topicality.co`<br/>`www.topicality.co`                   | Production workloads      |

## 🔧 Prerequisites

### Required Infrastructure

- **EC2 instances** (t3.micro or larger) running Ubuntu 20.04+
- **SSH access** with keypair authentication
- **Cloudflare DNS** pointing to EC2 public IPs
- **Security groups** allowing inbound 80/443

### Local Requirements

```bash
# Install required tools
curl -fsSL https://get.docker.com | sh
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
```

## 🚀 Quick Deployment

### Option 1: Automated Multi-Environment Deployment

```bash
# Clone and prepare
git clone https://github.com/BrianCLong/summit.git
cd summit
git checkout v2025.09.21-mega-merge

# Configure SSH key (replace with your key)
cp your-keypair.pem ~/.ssh/maestro-keypair.pem
chmod 600 ~/.ssh/maestro-keypair.pem

# Deploy to all environments
./scripts/deploy-now.sh
```

### Option 2: AWS ECR + Multi-Environment

```bash
# Configure AWS
aws configure
export ECR_REGISTRY="123456789012.dkr.ecr.us-east-2.amazonaws.com"

# Build and push to ECR
./scripts/build-push.sh $ECR_REGISTRY

# Deploy with ECR images
./scripts/deploy-all.sh
```

### Option 3: Single Environment

```bash
# Deploy to specific environment
ssh -i ~/.ssh/your-key.pem ubuntu@your-host.com

# On remote host:
curl -fsSL https://raw.githubusercontent.com/BrianCLong/summit/v2025.09.21-mega-merge/scripts/deploy-now.sh | bash
```

## 🔍 Health Checks

After deployment, verify all services:

```bash
# Test health endpoints
curl https://intelgraph-dev.topicality.co/healthz
curl https://stage.topicality.co/healthz
curl https://prod.topicality.co/healthz

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-09-21T...",
  "service": "summit",
  "version": "v2025.09.21-mega-merge",
  "deployment": "successful"
}
```

## 🌐 Live URLs (Post-Deployment)

### Development

- **IntelGraph Dev**: https://intelgraph-dev.topicality.co
- **Maestro Dev**: https://maestro-dev.topicality.co

### Staging

- **Stage**: https://stage.topicality.co

### Production

- **Production**: https://prod.topicality.co
- **WWW**: https://www.topicality.co

## 🔄 Rollback Procedures

If deployment issues occur:

```bash
# Automatic rollback (built into deploy scripts)
# Previous version automatically restored on failure

# Manual rollback
ssh ubuntu@target-host
cd /opt/summit
docker-compose down
docker tag summit:previous summit:latest
docker-compose up -d
```

## 📊 Monitoring & Observability

### Built-in Monitoring

- **Health checks**: `/healthz` endpoint on all services
- **Docker health checks**: Built into containers
- **Process monitoring**: systemd/docker restart policies

### Log Access

```bash
# View application logs
ssh ubuntu@target-host
cd /opt/summit
docker-compose logs -f summit

# System logs
journalctl -u docker -f
```

## 🔒 Security Configuration

### Environment Variables

Create `.env` files for each environment:

```bash
# .env.prod example
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-key
REDIS_URL=redis://host:6379
```

### Secrets Management

- Use AWS Secrets Manager for production secrets
- Environment variables for configuration
- No secrets in Docker images or git

## 🚨 Troubleshooting

### Common Issues

**SSH Connection Failed**

```bash
# Check SSH key permissions
chmod 600 ~/.ssh/maestro-keypair.pem

# Test SSH connectivity
ssh -i ~/.ssh/maestro-keypair.pem ubuntu@target-host
```

**Docker Build Failed**

```bash
# Check Docker daemon
sudo systemctl status docker
sudo systemctl start docker

# Check disk space
df -h
```

**Service Not Responding**

```bash
# Check container status
docker-compose ps
docker-compose logs summit

# Restart services
docker-compose restart
```

## 📞 Support

### Deployment Support

- **GitHub Issues**: https://github.com/BrianCLong/summit/issues
- **Release Notes**: https://github.com/BrianCLong/summit/releases/tag/v2025.09.21-mega-merge

### Emergency Procedures

1. **Service Down**: Automatic restart via Docker health checks
2. **Complete Failure**: Rollback to previous version
3. **Data Issues**: Point-in-time restore from backups

---

## 🎉 Deployment Complete!

Once deployed, Summit provides:

- **🧠 MCP Core Server** - Model Context Protocol
- **🎼 Maestro Conductor UI** - Enterprise interface
- **📊 Real-time Analytics** - Intelligence processing
- **🔍 Graph Analytics** - Neo4j integration
- **⚡ AI/ML Suite** - Latest torch/transformers

**Summit is now live and ready for enterprise intelligence analysis!**
