# Local Development Configuration Guide

> **Purpose**: Comprehensive guide to local development environment configuration, profiles, and secrets management.

## Overview

Summit uses Docker Compose profiles to manage different development scenarios. This guide covers:
- Profile selection and customization
- Service dependencies and mocking
- Secrets management
- Troubleshooting common issues

---

## Docker Compose Profiles

### Profile Hierarchy

```
minimal
   └── core (default)
         └── observability
               └── ai
                     └── full
```

### Available Profiles

#### `minimal` - Databases Only
For frontend-only work or when running API locally (outside Docker).

```bash
summit up --profile minimal
# OR: docker-compose --profile minimal up -d
```

**Services:**
- `postgres` (5432) - Primary relational database
- `redis` (6379) - Cache and pub/sub
- `neo4j` (7474, 7687) - Graph database

**Memory:** ~1.5GB

---

#### `core` - Standard Development (Default)
Full application stack for typical development.

```bash
summit up
# OR: docker-compose up -d
```

**Services (adds to minimal):**
- `api` (4000) - GraphQL API server
- `web` (3000) - React frontend
- `gateway` (4100) - API gateway
- `websocket-server` (9001) - Real-time updates
- `elasticsearch` (9200) - Search

**Memory:** ~4GB

---

#### `observability` - With Monitoring
For debugging performance issues or developing observability features.

```bash
summit up --profile observability
```

**Services (adds to core):**
- `prometheus` (9090) - Metrics collection
- `grafana` (3001) - Dashboards
- `jaeger` (16686) - Distributed tracing
- `loki` (3100) - Log aggregation
- `promtail` - Log shipping
- `alertmanager` (9093) - Alert routing

**Memory:** ~6GB

---

#### `ai` - With AI/ML Services
For Copilot development or AI feature work.

```bash
summit up --profile ai
```

**Services (adds to observability):**
- `ai-sandbox` (4020) - AI task runner
- `kafka` / `redpanda` - Event streaming
- GPU support (if available)

**Memory:** ~10GB (12GB+ recommended)

---

#### `full` - Everything
Complete stack for integration testing or production simulation.

```bash
summit up --profile full
```

**Memory:** ~12GB

---

## Service Configuration

### Port Mappings

| Service | Default Port | Container Port | Override Env Var |
|---------|--------------|----------------|------------------|
| web | 3000 | 3000 | `WEB_PORT` |
| api | 4000 | 4000 | `API_PORT` |
| gateway | 4100 | 4100 | `GATEWAY_PORT` |
| postgres | 5432 | 5432 | `POSTGRES_PORT` |
| redis | 6379 | 6379 | `REDIS_PORT` |
| neo4j-http | 7474 | 7474 | `NEO4J_HTTP_PORT` |
| neo4j-bolt | 7687 | 7687 | `NEO4J_BOLT_PORT` |
| elasticsearch | 9200 | 9200 | `ES_PORT` |
| prometheus | 9090 | 9090 | - |
| grafana | 3001 | 3000 | `GRAFANA_PORT` |
| jaeger | 16686 | 16686 | - |

### Port Conflict Resolution

If you have other services on standard ports:

```bash
# Create .env.local with overrides (gitignored)
cat >> .env.local << EOF
API_PORT=4001
WEB_PORT=3001
POSTGRES_PORT=5433
EOF

# Use with docker-compose
docker-compose --env-file .env --env-file .env.local up -d
```

---

## Mocking External Services

For faster startup or offline work, mock external dependencies:

### Mock Mode

```bash
summit up --mock-external
# OR
MOCK_EXTERNAL=true docker-compose up -d
```

This starts `mock-services` container providing:
- Mock OAuth provider (port 8088)
- Mock S3 (MinIO, port 9000)
- Mock Vault (port 8200)

### Service-Specific Mocks

```bash
# Mock only identity provider
MOCK_AUTH=true summit up

# Use mock data instead of real databases
MOCK_DATA=true summit up
```

### Mock Service Configuration

Located in `scripts/devkit/mock-services.js`:

```javascript
// Add custom mocks
module.exports = {
  '/api/external-service': {
    response: { data: 'mocked' },
    delay: 100  // Simulate latency
  }
};
```

---

## Secrets Management

### Development Secrets

For local development, secrets are stored in `.env` (gitignored).

**Initial Setup:**
```bash
summit bootstrap
# Creates .env from .env.example with dev-safe defaults
```

**DO NOT** use production secrets locally. All default values work for development.

### Sensitive Operations

For features requiring real secrets (OAuth, external APIs):

```bash
# Initialize local secret store (uses age encryption)
summit secrets init

# Add a secret
summit secrets set GITHUB_TOKEN
# Prompts for value, stores encrypted in ~/.summit/secrets.age

# Secrets auto-inject when running
summit up  # Decrypts and injects secrets to containers
```

### Team Secret Sharing

For shared development secrets (staging APIs, shared test accounts):

```bash
# Sync from team vault (requires access)
summit secrets sync --team

# Export for CI (encrypted)
summit secrets export --ci > secrets.enc
```

### Secret Reference

| Secret | Required For | Dev Default | How to Get Real Value |
|--------|--------------|-------------|----------------------|
| `JWT_SECRET` | Auth | `dev-jwt-secret-xxx` | Auto-generated OK |
| `NEO4J_PASSWORD` | Graph DB | `devpassword` | Auto-generated OK |
| `POSTGRES_PASSWORD` | SQL DB | `devpassword` | Auto-generated OK |
| `GITHUB_TOKEN` | GitHub API | None | Personal access token |
| `OPENAI_API_KEY` | AI features | None | OpenAI dashboard |

---

## Environment Customization

### Custom Config File

Create `.summitrc.json` in project root:

```json
{
  "profile": "observability",
  "autoStart": ["postgres", "redis", "neo4j"],
  "skipServices": ["elasticsearch"],
  "env": {
    "LOG_LEVEL": "debug",
    "FEATURE_FLAG_NEW_UI": "true"
  },
  "hooks": {
    "postUp": "npm run db:seed"
  }
}
```

### Per-Developer Overrides

Create `docker-compose.override.yml` (gitignored):

```yaml
version: '3.9'

services:
  api:
    environment:
      - DEBUG=summit:*
      - LOG_LEVEL=debug
    volumes:
      - ./server/src:/app/src:delegated  # Hot reload

  web:
    environment:
      - VITE_DEBUG=true
```

### Hot Reload Configuration

**API (Node.js):**
```yaml
# docker-compose.override.yml
services:
  api:
    volumes:
      - ./server/src:/app/src:cached
    environment:
      - NODE_ENV=development
      - TS_NODE_DEV=true
    command: npx nodemon --watch src --exec ts-node src/index.ts
```

**Web (Vite):**
Hot reload works by default. For debugging:
```yaml
services:
  web:
    environment:
      - VITE_HMR_HOST=localhost
      - VITE_HMR_PORT=3000
```

---

## Resource Management

### Memory Allocation

**Docker Desktop Settings:**
- Development: 8GB minimum, 12GB recommended
- AI Profile: 12GB minimum, 16GB recommended

**Per-Service Limits:**
```yaml
# docker-compose.override.yml
services:
  neo4j:
    deploy:
      resources:
        limits:
          memory: 2G
```

### CPU Allocation

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
```

### Disk Space

Check available space:
```bash
summit doctor --resources
```

Clean up:
```bash
summit clean --docker  # Remove unused images, containers, volumes
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find what's using the port
lsof -i :4000

# Kill it
kill -9 <PID>

# Or use different port
API_PORT=4001 summit up
```

#### Container Won't Start

```bash
# Check logs
summit logs api --tail 50

# Check health
summit status

# Rebuild
summit up --build api
```

#### Database Connection Refused

```bash
# Ensure DB is healthy
summit status

# Check if migration needed
summit db migrate

# Reset if corrupted
summit db reset  # WARNING: Destroys data!
```

#### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Aggressive cleanup
summit clean --deep
```

#### Slow Performance on macOS

Use `:cached` or `:delegated` volume mounts:
```yaml
volumes:
  - ./src:/app/src:delegated
```

Or use Docker's VirtioFS file sharing (Docker Desktop settings).

---

## Network Configuration

### Default Network

All services join the `summit` bridge network:

```yaml
networks:
  summit:
    driver: bridge
```

### Accessing Services

**From Host:**
- Use `localhost:<port>`

**Between Containers:**
- Use service name: `http://api:4000`

**From Container to Host:**
- Use `host.docker.internal`

### Custom Networks

For multi-project development:

```yaml
# docker-compose.override.yml
networks:
  summit:
    name: shared-dev-network
    external: true
```

---

## Reference: Environment Variables

### Core Application

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `4000` | API server port |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `DEBUG` | - | Debug namespaces |

### Database Connections

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (generated) | PostgreSQL connection |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_AI_FEATURES` | `true` | AI/Copilot features |
| `ENABLE_REAL_TIME` | `true` | WebSocket features |
| `ENABLE_METRICS` | `true` | Prometheus metrics |

See `.env.example` for complete reference.
