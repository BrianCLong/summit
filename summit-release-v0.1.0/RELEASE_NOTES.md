# Summit v0.1.0 - Docker Release Notes

Welcome to the first official release of the Summit/IntelGraph platform! This release includes a complete Docker-based deployment package with core services, application layer, and observability stack.

## 🚀 Highlights

- **One-command deployment** of core database services (PostgreSQL, Redis, Neo4j)
- **Production-ready configuration** with health checks, restart policies, and dependency management
- **Profile-based architecture** allowing selective service deployment (core, app, observability)
- **High port strategy** to avoid system conflicts (PostgreSQL: 15432, Redis: 16379, Neo4j: 17474/17687, Adminer: 18080)
- **Quality of life commands** via Makefile (`make up`, `make app`, `make verify`, `make smoke`, `make nuke`, `make doctor`)
- **Comprehensive documentation** with troubleshooting and permission guidance

## 📦 What's Included

### Core Services
- PostgreSQL 16 (on port 15432)
- Redis 7 (on port 16379) 
- Neo4j 5.24 (browser: 17474, bolt: 17687)
- Adminer (on port 18080)

### Application Layer (Ready for Images)
- API service (on port 18081)
- Web service (on port 18082)
- Health checks and proper startup dependencies

### Observability Stack
- Prometheus
- Grafana
- Loki
- Alertmanager

## 🔧 Key Features

- **Health-gated startup**: Services wait for dependencies before starting
- **Production resilience**: Restart policies and health checks
- **Clean separation**: Core vs app vs observability services
- **Permission-safe operations**: Handles root-owned containers appropriately
- **Scoped cleanup**: Targeted resource management without system-wide effects

## 🚀 Quick Start

```bash
# Start core services
make up && make verify

# Start app services on top of core (when images available)
make app && make smoke

# Check status
make ps

# View logs
make logs

# Diagnostic check
make doctor

# Clean up
make down
```

## 🔌 Access Points

- **Adminer UI**: http://localhost:18080
  - PostgreSQL: localhost:15432, user: summit, password: postgrespass
- **Neo4j Browser**: http://localhost:17474 (credentials: neo4j/neo4jpass)
- **Neo4j Bolt**: bolt://localhost:17687
- **API**: http://localhost:18081 (when app services running)
- **Web UI**: http://localhost:18082 (when app services running)

## 🔄 Day 2 Operations

- **Upgrade**: Update image tags in docker-compose.app.yml and run `make app`
- **Backup**: Use the volume backup commands in the README
- **Restore**: Stop services, restore volumes, then `make up`
- **Cleanup**: `make nuke` for safe removal of Summit resources

## 🛠️ Troubleshooting

If you encounter permission issues:
1. Ensure your user is in the docker group: `sudo usermod -aG docker $USER`
2. Log out and back in to activate group membership
3. Use `make nuke` to clean up any root-owned resources

See the full README for comprehensive troubleshooting and permissions guidance.

## 📋 Release Contents

- `docker-compose.fresh.yml` - Core services with profiles
- `docker-compose.app.yml` - Application layer with health checks
- `docker-compose.observability.yml` - Metrics and logging stack
- `Makefile` - Quality-of-life commands
- `README.md` - Complete documentation
- `.env` - Configuration template
- `scripts/smoke.sh` - Enhanced health checks
- `.github/workflows/` - CI/CD pipeline templates

## 📊 Operational SLOs

The following service level objectives guide the operation and monitoring of Summit v0.1.0:

- **API availability** ≥ 99.9% monthly (monitored by Prometheus alert rule)
- **API 5xx error ratio** < 1% (warning triggered at 5% for 10m)
- **DR drill success** ≤ 10 minutes (validated via `make dr-drill`)
- **P1 incident response** (full API outage): Time to Detection ≤ 5m, Time to Recovery ≤ 30m

## 🔄 What's Next

- Integration with actual application images
- Enhanced security policies and RBAC
- Performance tuning and optimization
- Production deployment guides

---

**Summit v0.1.0** - A solid foundation for your IntelGraph platform with production-ready deployment patterns.