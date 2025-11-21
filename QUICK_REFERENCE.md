# Summit/IntelGraph - Quick Reference Card

**Version:** 1.0 | **Status:** Production Ready ✅ | **Last Updated:** November 2025

---

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repo-url> && cd summit
make bootstrap          # Install dependencies (~2 min)
make up                 # Start core services (~3 min)
make smoke             # Validate golden path (~1 min)

# Alternative with AI stack
./start.sh --ai
```

---

## 📍 Key URLs (Local Development)

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main application |
| **GraphQL** | http://localhost:4000/graphql | API playground |
| **Neo4j Browser** | http://localhost:7474 | Graph database UI |
| **Grafana** | http://localhost:3001 | Monitoring dashboards |
| **Prometheus** | http://localhost:9090 | Metrics collection |

---

## 📚 Essential Documentation

| Need | Document | Path |
|------|----------|------|
| **Overview** | Master Planning | `/MASTER_PLANNING.md` |
| **Sprint Catalog** | Sprint Index | `/SPRINT_INDEX.md` |
| **All Docs Guide** | Documentation Map | `/DOCUMENTATION_MAP.md` |
| **Executive Brief** | Executive Summary | `/EXECUTIVE_SUMMARY.md` |
| **Operations** | Runbook | `/RUNBOOK.md` |
| **Security** | Security Guide | `/SECURITY.md` |
| **Architecture** | Repository Structure | `/REPOSITORY-STRUCTURE.md` |

---

## 🔧 Common Commands

### Development

```bash
make up              # Start core services
make up-ai           # Start with AI processing
make up-kafka        # Start with Kafka streaming
make up-full         # Start all services
make down            # Stop all services
make logs            # View service logs
```

### Testing

```bash
make test            # Run all tests
make test-e2e        # Run end-to-end tests
make lint            # Run linting
make typecheck       # TypeScript validation
make smoke           # Golden path validation
```

### Git Operations

```bash
git status           # Check changes
git add .            # Stage changes
git commit -m "msg"  # Commit with message
git push -u origin <branch>  # Push to remote
```

---

## 🏗️ Architecture at a Glance

```
Frontend (React + MUI + Cytoscape)
         ↓
    API Gateway
   (GraphQL + REST)
         ↓
┌────────┬────────┬────────┬────────┐
│ Neo4j  │Postgres│  OPA   │Maestro │
│(Graph) │(Meta)  │(Policy)│(Orch)  │
└────────┴────────┴────────┴────────┘
         ↓
┌────────┬────────┬────────┬────────┐
│ Redis  │Timescale│pgvector│  S3   │
│(Cache) │(Metrics)│(Vector)│(Store)│
└────────┴────────┴────────┴────────┘
```

---

## 📊 Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **API Latency (p95)** | < 200ms | 127ms ✅ |
| **Graph Query (p95)** | < 1.5s | 1.2s ✅ |
| **Availability** | 99.9% | 100% ✅ |
| **Security Score** | 100% | 100% ✅ |
| **Test Coverage** | > 80% | 86% ✅ |

---

## 🔐 Security Quick Reference

### Authentication Flow
```
User → OIDC/SSO → JWT (15min access) → Refresh (7-day)
```

### Authorization Model
```
Request → OPA Policy Check → ABAC Rules → Allow/Deny + Reason
```

### Key Security Features
- Zero-trust networking (Cilium L7)
- mTLS between services (Istio)
- Secrets in Vault (auto-rotation)
- SBOM + SLSA provenance
- Real-time threat detection (Falco)

---

## 🤖 AI/ML Capabilities

### Maestro Conductor
- **Multi-provider routing:** GPT-4, Claude, Gemini, Grok
- **Local models:** Ollama (Llama, Qwen, DeepSeek)
- **Cost optimization:** $3.45 → $0.28/PR (92% reduction)

### Intelligence Pipeline
1. **NER** - 95%+ confidence entity extraction
2. **Graph ML** - Relationship inference (GraphSAGE)
3. **Vectors** - 384-dim semantic similarity
4. **Prediction** - APT/insider threat assessment
5. **NLU** - 91% intent recognition

---

## 📋 Sprint Quick Facts

| Metric | Value |
|--------|-------|
| **Total Sprints** | 100+ documented |
| **Sprint Duration** | 2 weeks (10 days) |
| **Avg Velocity** | 40-50 points |
| **Completion Rate** | 95%+ |
| **Focus Factor** | 0.75-0.80 |

### Sprint Locations
- **Named:** `/SPRINT_*.md` (13 files)
- **Chronological:** `/docs/sprints/` (60+ files)
- **Maestro:** `/docs/sprints/maestro_v_*.md` (17 files)
- **Future:** `/october2025/` (60+ files)

---

## 🚨 Incident Response

### Health Checks
```bash
curl http://localhost:4000/health          # Basic
curl http://localhost:4000/health/detailed # Full status
curl http://localhost:4000/health/ready    # K8s readiness
curl http://localhost:4000/health/live     # K8s liveness
```

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| **503 errors** | Service down | `make up` or restart pods |
| **Slow queries** | Missing index | Check Neo4j explain plans |
| **Auth failures** | Token expired | Refresh JWT or re-login |
| **OOM errors** | Memory leak | Check heap dumps, restart |

### Escalation Path
1. Check `/health/detailed` endpoint
2. Review Grafana dashboards
3. Check service logs (`make logs`)
4. Consult `RUNBOOK.md`
5. Escalate to on-call

---

## 📞 Support Contacts

| Role | Contact | For |
|------|---------|-----|
| **Engineering** | See SUPPORT.md | Technical issues |
| **Security** | See SECURITY.md | Vulnerabilities |
| **Operations** | See RUNBOOK.md | Incidents |

---

## 🔗 Related Documents

| Document | Description |
|----------|-------------|
| [MASTER_PLANNING.md](MASTER_PLANNING.md) | Comprehensive planning hub |
| [SPRINT_INDEX.md](SPRINT_INDEX.md) | All sprint plans organized |
| [DOCUMENTATION_MAP.md](DOCUMENTATION_MAP.md) | Full documentation index |
| [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) | Stakeholder brief |
| [RUNBOOK.md](RUNBOOK.md) | Operational procedures |
| [SECURITY.md](SECURITY.md) | Security policies |
| [README.md](README.md) | Project overview |

---

## 📈 Performance Targets

### Response Times
- **API Gateway:** p95 < 200ms
- **Graph Queries:** p95 < 1.5s
- **Stream Processing:** > 1M events/sec

### Resource Limits
- **Memory:** 4GB per service (default)
- **CPU:** 2 cores per service (default)
- **Connections:** 100 per database pool

### Scaling Thresholds
- **HPA trigger:** CPU > 70%
- **Scale up:** +2 pods
- **Scale down:** CPU < 30% for 5min

---

## 🏷️ Version Info

| Component | Version |
|-----------|---------|
| **Platform** | v3.0.0-ga |
| **Node.js** | 20+ |
| **React** | 18.x |
| **Neo4j** | 5.x |
| **PostgreSQL** | 15+ |
| **Redis** | 7.x |
| **Kubernetes** | 1.28+ |

---

*Quick Reference v1.0 | See [MASTER_PLANNING.md](MASTER_PLANNING.md) for full details*
