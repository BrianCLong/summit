# AWS Free Tier Enhanced Production Deployment

Complete zero-cost production deployment solution using AWS Always-Free services with maximum power and enterprise-grade capabilities.

## 🎯 Overview

This deployment strategy leverages AWS Free Tier services to create a powerful, production-ready infrastructure at **$0 cost**:

- **Enhanced Compute**: t4g.small (2 vCPU, 2GB RAM) - Free until Dec 31, 2025
- **Global CDN**: CloudFront (1TB/month free egress + 10M requests)
- **Container Platform**: k3s on EC2 with comprehensive monitoring
- **Security**: Multi-layer defense with OPA Gatekeeper, Falco, and WAF
- **Observability**: Prometheus + Grafana + CloudWatch integration
- **CI/CD**: GitHub Actions with automated testing and deployment

## 🏗️ Architecture

```
Internet → CloudFront (1TB free) → Route 53 → EC2 (t4g.small free)
                                              ├── k3s Cluster
                                              ├── Maestro (2+ replicas)
                                              ├── Prometheus + Grafana
                                              ├── OPA Gatekeeper
                                              ├── Falco Security
                                              └── NGINX Ingress
```

## 🚀 Quick Start

### Prerequisites

1. **AWS Account** with Free Tier or Always-Free access
2. **Domain** managed by Cloudflare (free plan)
3. **GitHub Repository** with Actions enabled
4. **Local Tools**: AWS CLI, kubectl, helm, docker

### 1. One-Command Deployment

```bash
# Clone and setup
git clone https://github.com/BrianCLong/summit
cd intelgraph/deploy/aws

# Configure environment
export ROOT_DOMAIN="yourdomain.com"
export AWS_REGION="us-east-1"
export MAESTRO_IMAGE="ghcr.io/yourusername/maestro:latest"

# Deploy everything
chmod +x zero-cost-production-setup.sh
./zero-cost-production-setup.sh
```

### 2. GitHub Actions Setup

Add these secrets to your GitHub repository:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Kubernetes Config (base64 encoded)
KUBECONFIG_STAGING=base64-encoded-kubeconfig
KUBECONFIG_PRODUCTION=base64-encoded-kubeconfig

# Optional: Private registry credentials
DOCKER_USERNAME=your-username
DOCKER_PASSWORD=your-token
```

Add these variables:

```bash
ROOT_DOMAIN=yourdomain.com
INSTANCE_TYPE=t4g.small  # or t3.micro for legacy free tier
AWS_KEY_NAME=your-keypair-name
```

### 3. Deploy with GitHub Actions

```bash
# Automatic deployment on push to main
git push origin main

# Manual deployment
gh workflow run "Deploy to AWS Free Tier" \
  --field environment=staging \
  --field force_rebuild=true
```

## 📊 Monitoring & Observability

### Grafana Dashboards

Access monitoring at: `kubectl port-forward svc/grafana 3000:3000 -n monitoring`

- **Maestro Overview**: SLO tracking, request rates, error rates
- **AWS Infrastructure**: EC2 metrics, CloudFront traffic, costs
- **Security Dashboard**: Policy violations, Falco alerts, network events

### Key Metrics Tracked

- **Availability SLO**: 99.9% uptime target
- **Latency SLO**: P95 < 5 seconds
- **Error Rate SLO**: < 0.1%
- **AWS Costs**: Real-time billing alerts
- **Security Events**: Runtime threat detection

### Alerting

Alerts are configured for:

- SLO breaches (availability, latency, errors)
- AWS billing thresholds
- Security policy violations
- Runtime security threats
- Resource exhaustion

## 🔒 Security Features

### Defense in Depth

1. **Infrastructure Security**
   - VPC with security groups
   - WAF with rate limiting
   - TLS 1.2+ enforcement

2. **Container Security**
   - Image vulnerability scanning
   - Signature verification with Cosign
   - SBOM generation

3. **Runtime Security**
   - Falco threat detection
   - OPA Gatekeeper policies
   - Network segmentation

4. **Application Security**
   - Non-root containers
   - Read-only filesystems
   - Resource limits
   - Security headers

### Security Policies Enforced

- **Image Digests**: All images must use SHA256 digests
- **Resource Limits**: CPU/memory limits required
- **Security Context**: Non-root, no privilege escalation
- **Network Policies**: Default deny with explicit allows

## 📈 Cost Optimization

### Free Tier Utilization

| Service         | Free Allowance               | Usage Strategy                         |
| --------------- | ---------------------------- | -------------------------------------- |
| EC2 (t4g.small) | 750 hrs/month until Dec 2025 | Single instance, auto-scaling disabled |
| CloudFront      | 1TB egress + 10M requests    | Cache optimization, compression        |
| CloudWatch      | 5GB logs, 10 metrics         | Selective logging, metric aggregation  |
| Route 53        | First hosted zone            | Single domain                          |
| ACM             | Unlimited certificates       | Wildcard certs                         |

### Billing Alerts

Automatic alerts configured at:

- $1 (warning)
- $5 (critical)
- $10 (emergency)

## 🔄 CI/CD Pipeline

### Automated Workflow

1. **Code Push** → GitHub Actions trigger
2. **Security Scan** → Trivy vulnerability scanning
3. **Build & Test** → Multi-arch container build
4. **Sign & Verify** → Cosign image signing
5. **Deploy Staging** → Automated staging deployment
6. **Load Test** → k6 performance validation
7. **Deploy Production** → Canary rollout with monitoring
8. **Smoke Test** → Production validation

### Deployment Strategies

- **Staging**: Rolling update with health checks
- **Production**: Canary deployment (10% → 25% → 50% → 100%)
- **Rollback**: Automatic on health check failure

## 🛠️ Operations

### Daily Operations

```bash
# Check cluster status
kubectl get pods -A

# View application logs
kubectl logs -f deployment/maestro -n maestro-prod

# Scale application
kubectl scale deployment maestro --replicas=3 -n maestro-prod

# Force new deployment
kubectl rollout restart deployment/maestro -n maestro-prod
```

### Monitoring Commands

```bash
# Access Grafana
kubectl port-forward svc/grafana 3000:3000 -n monitoring

# View Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n monitoring

# Check resource usage
kubectl top pods -A --sort-by=cpu
```

### Troubleshooting

```bash
# Check Gatekeeper violations
kubectl get constraints

# View Falco security events
kubectl logs daemonset/falco -n security-system

# Check CloudFront status
aws cloudfront list-distributions --query 'DistributionList.Items[*].{ID:Id,Domain:DomainName,Status:Status}'

# Validate SSL certificates
echo | openssl s_client -connect maestro.yourdomain.com:443 -servername maestro.yourdomain.com
```

## 📚 Architecture Decisions

### Why k3s over EKS?

- **Cost**: $0 vs $73/month for EKS control plane
- **Simplicity**: Single-node deployment, easier management
- **Performance**: Lower overhead on small instances
- **Features**: Full Kubernetes API compatibility

### Why CloudFront over ALB?

- **Cost**: 1TB free egress vs immediate charges
- **Global**: Edge locations worldwide
- **Caching**: Reduces origin load
- **Security**: Built-in DDoS protection

### Why t4g.small over t3.micro?

- **Performance**: 2 vCPU vs 2 vCPU (burstable)
- **Memory**: 2GB vs 1GB
- **Cost**: Free until Dec 2025 vs 750 hrs/month
- **Architecture**: ARM64 efficiency

## 🔮 Scaling Beyond Free Tier

When you outgrow the free tier:

1. **Horizontal Scaling**: Add more t4g.small instances
2. **Vertical Scaling**: Upgrade to larger instances
3. **Managed Services**: Migrate to EKS + RDS
4. **Multi-Region**: Add additional regions for redundancy

### Cost Projections

- **1-10 users**: $0/month (Free Tier)
- **10-100 users**: $20-50/month (Small instances)
- **100-1000 users**: $100-300/month (Auto-scaling, RDS)
- **1000+ users**: $500+/month (EKS, managed services)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your improvements
4. Test with your AWS account
5. Submit a pull request

## 📞 Support

- **Documentation**: This README and inline comments
- **Issues**: GitHub Issues for bugs and feature requests
- **Discussions**: GitHub Discussions for questions
- **Security**: security@yourdomain.com for security issues

## 🎉 Success Metrics

After deployment, you'll achieve:

- ✅ **99.9% availability** with automated monitoring
- ✅ **< 3s P95 latency** with global CDN
- ✅ **< 0.1% error rate** with comprehensive testing
- ✅ **$0 monthly cost** within AWS Free Tier limits
- ✅ **Enterprise security** with multi-layer defense
- ✅ **Full observability** with metrics, logs, traces
- ✅ **Automated CI/CD** with GitHub Actions
- ✅ **Production-ready** infrastructure

---

**🚀 Ready to deploy your zero-cost production infrastructure? Run the setup script and join the revolution!**
