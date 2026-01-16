# Summit Dev Container

**Containerized development environment for Summit with full-stack services.**

## Overview

The Summit Dev Container provides a complete, reproducible development environment that runs inside a Docker container. It includes all necessary tools, dependencies, and services pre-configured and ready to use.

## What's Included

### Development Tools

All tools from the [Ubuntu bootstrap](README.md) plus:
- **Node.js 20** with TypeScript, pnpm via corepack
- **Kubernetes tools**: kubectl v1.29.0, helm v3.14.0, k9s v0.32.4
- **Security tools**: gitleaks v8.18.2, trivy, grype, syft, cosign, SLSA verifier
- **Container tools**: Docker-in-Docker, dive (image analysis)
- **CI/CD tools**: GitHub CLI, actionlint, semantic-release
- **Database clients**: psql (PostgreSQL), redis-cli, cypher-shell (Neo4j)
- **CLI utilities**: ripgrep, fd-find, jq, yq, htop, tree
- **Load testing**: k6
- **Shell tools**: shellcheck, pre-commit

### Backend Services (via Docker Compose)

All services run automatically when you open the Dev Container:

| Service | Port | Credentials | Description |
|---------|------|-------------|-------------|
| **PostgreSQL** | 5432 (host: 5434) | `intelgraph` / `dev_password` | Primary database |
| **Redis** | 6379 | (none) | Cache and queues |
| **Neo4j** | 7474 (browser), 7687 (bolt) | `neo4j` / `dev_password` | Graph database |
| **OPA** | 8181 | (none) | Policy engine |
| **Prometheus** | 9090 | (none) | Metrics collection |
| **Grafana** | 8080 (host) | `admin` / `dev_password` | Dashboards |
| **Jaeger** | 16686 | (none) | Distributed tracing UI |
| **OTEL Collector** | 4317 (gRPC), 4318 (HTTP) | (none) | Telemetry collector |

### Application Services

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | 4000 | GraphQL API server |
| **Web App** | 3000 | Frontend application |
| **Worker** | 4100 | Background job processor |
| **Mock Services** | 4010 (host: 4012) | Test doubles for external APIs |

## Prerequisites

### Option 1: VS Code (Local)

1. **Docker Desktop** or **Docker Engine** installed and running
2. **VS Code** with "Dev Containers" extension installed:
   ```bash
   code --install-extension ms-vscode-remote.remote-containers
   ```

### Option 2: GitHub Codespaces (Cloud)

- GitHub account with Codespaces enabled
- No local installation required!

## Quick Start

### VS Code (Local)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YourOrg/summit.git
   cd summit
   ```

2. **Open in VS Code**:
   ```bash
   code .
   ```

3. **Reopen in Container**:
   - VS Code should show a notification: "Folder contains a Dev Container configuration"
   - Click "Reopen in Container"
   - **OR** use Command Palette (Cmd/Ctrl+Shift+P): "Dev Containers: Reopen in Container"

4. **Wait for setup** (~5-10 minutes first time):
   - Docker builds the container image
   - Services start (PostgreSQL, Redis, Neo4j, etc.)
   - Dependencies install (`npm ci`, migrations run)
   - Verification runs automatically

5. **Start developing**:
   ```bash
   # Already running via docker-compose:
   # - API: http://localhost:4000
   # - Web: http://localhost:3000
   # - Worker: running in background

   # Run tests
   npm test

   # View service info
   env-info
   ```

### GitHub Codespaces (Cloud)

1. **Create Codespace**:
   - Go to: https://github.com/YourOrg/summit
   - Click green "Code" button
   - Select "Codespaces" tab
   - Click "Create codespace on main"

2. **Wait for setup** (~8-12 minutes first time):
   - VM provisions
   - Dev Container builds
   - Services start
   - Dependencies install

3. **Start developing**:
   - VS Code opens in browser automatically
   - All services running and accessible via forwarded ports
   - Use built-in terminal for commands

## Usage

### Connecting to Services

**PostgreSQL**:
```bash
# Using built-in function
psql-dev

# Or manually
PGPASSWORD=dev_password psql -h postgres -U intelgraph -d intelgraph_dev

# Run migrations
cd server && npm run migrate
```

**Redis**:
```bash
# Using built-in function
redis-dev

# Or manually
redis-cli -h redis

# Test connection
redis-dev ping
```

**Neo4j**:
```bash
# Using built-in function
neo4j-dev

# Or manually
cypher-shell -a bolt://neo4j:7687 -u neo4j -p dev_password

# Browser UI
# Open: http://localhost:7474
```

**Docker Compose Management**:
```bash
# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f api
logs api  # Using built-in function

# Restart service
docker-compose restart redis
restart redis  # Using built-in function

# Stop all services
docker-compose down

# Start all services
docker-compose up -d
```

### Development Workflow

**Run the full stack**:
```bash
# Services auto-start when container opens
# Check status:
docker-compose ps

# API available at: http://localhost:4000
# Web available at: http://localhost:3000
```

**Run tests**:
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# All tests
test-all  # Built-in alias
```

**Linting and formatting**:
```bash
# Run ESLint
npm run lint

# Fix issues
npm run lint -- --fix

# Format with Prettier
npm run format

# Both (alias)
lint-fix
```

**Database operations**:
```bash
# Run migrations
cd server && npm run migrate

# Seed test data
node scripts/devkit/seed-fixtures.js

# Connect to DB
psql-dev
```

### Built-in Aliases and Functions

The Dev Container includes helpful shortcuts (defined in `.devcontainer/setup.sh`):

**Docker Compose**:
```bash
dc          # docker-compose
dcu         # docker-compose up -d
dcd         # docker-compose down
dcl         # docker-compose logs -f
```

**Git**:
```bash
gs          # git status
ga          # git add
gc          # git commit
gp          # git push
gl          # git pull
gco         # git checkout
gb          # git branch
gm          # git merge
```

**Development**:
```bash
dev         # npm run dev
build       # npm run build
lint-fix    # npm run lint -- --fix && npm run format
test-all    # npm run test && npm run test:e2e
npm-reset   # rm -rf node_modules && npm install
```

**Database connections**:
```bash
psql-dev    # Connect to PostgreSQL
redis-dev   # Connect to Redis
neo4j-dev   # Connect to Neo4j
```

**Service management**:
```bash
logs [service]     # View logs (all or specific service)
restart [service]  # Restart service
env-info          # Show environment info and all service URLs
```

## VS Code Extensions

The Dev Container automatically installs these extensions:

### Code Quality
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **ShellCheck** - Shell script linting

### Languages
- **TypeScript** - Latest TypeScript support
- **GraphQL** - GraphQL syntax and IntelliSense
- **YAML** - YAML support
- **JSON** - JSON support

### DevOps
- **Docker** - Docker file support
- **Kubernetes** - K8s manifest support and cluster management
- **Terraform** - HCL syntax and terraform support

### Testing
- **Jest** - Test runner integration

### Productivity
- **GitHub Pull Requests** - PR management in VS Code
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **Path IntelliSense** - File path autocomplete
- **Code Spell Checker** - Spell checking

## Customization

### Environment Variables

Create `.env` file in project root (copied from `.env.example` on first setup):

```bash
# Example .env (not committed to git)
NODE_ENV=development
LOG_LEVEL=debug

# API keys (get from secure vault)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Feature flags
ENABLE_AI_FEATURES=true
```

### Install Additional Tools

**Inside the container**:
```bash
# Install npm packages globally
npm install -g <package>

# Install apt packages (requires sudo, but node user has it)
sudo apt-get update && sudo apt-get install -y <package>

# Install via pipx (Python tools)
pipx install <package>
```

**Persist changes** (rebuild container):
1. Edit `.devcontainer/Dockerfile` to add tool installation
2. Rebuild container: Command Palette → "Dev Containers: Rebuild Container"

### Add VS Code Extensions

Edit `.devcontainer/devcontainer.json`:

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "existing.extension",
        "your.new-extension"  // Add here
      ]
    }
  }
}
```

Then rebuild: "Dev Containers: Rebuild Container"

### Modify Services

Edit `.devcontainer/docker-compose.yml` to add/modify services:

```yaml
services:
  your-service:
    image: your/image
    ports:
      - "8080:8080"
    networks:
      - intelgraph-dev
```

## Troubleshooting

### Container Won't Start

**Symptom**: "Failed to start container"

**Solution**:
```bash
# Check Docker is running
docker ps

# View container logs
docker logs <container-id>

# Rebuild container from scratch
# Command Palette → "Dev Containers: Rebuild Container Without Cache"
```

### Services Not Available

**Symptom**: "Connection refused" to PostgreSQL/Redis/Neo4j

**Solution**:
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs postgres
docker-compose logs redis
docker-compose logs neo4j

# Restart services
docker-compose restart

# Or restart specific service
docker-compose restart postgres
```

### Port Already in Use

**Symptom**: "Bind for 0.0.0.0:5432 failed: port is already allocated"

**Solution**:
```bash
# Find process using port (on host machine)
lsof -i :5432

# Kill process or change port in docker-compose.yml
# Example: "5433:5432" instead of "5432:5432"
```

### Node Modules Issues

**Symptom**: Module not found errors, dependency issues

**Solution**:
```bash
# Clear and reinstall (uses alias)
npm-reset

# Or manually
rm -rf node_modules package-lock.json
npm install

# For server/client subdirectories
cd server && npm-reset
cd client && npm-reset
```

### Slow Performance

**Symptom**: Container is slow, file operations lag

**Solution**:
1. **Increase Docker resources**:
   - Docker Desktop → Settings → Resources
   - Increase CPUs to 4+, Memory to 8GB+

2. **Use named volumes** (already configured):
   - `node_modules` stored in volume, not bind mount
   - Faster file access on macOS/Windows

3. **Exclude from antivirus** (Windows):
   - Add Docker WSL2 directories to exclusions

### Database Connection Issues

**Symptom**: "ECONNREFUSED" or "Connection timeout"

**Solution**:
```bash
# Wait for services to be healthy (check setup.sh log)
docker-compose ps

# Test connections manually
pg_isready -h postgres -U intelgraph
redis-cli -h redis ping
curl http://neo4j:7474

# Check networking
docker network ls
docker network inspect intelgraph-dev
```

## Performance Optimization

### Docker Desktop Settings (Mac/Windows)

Recommended resources:
- **CPUs**: 4-6 cores
- **Memory**: 8-12 GB
- **Swap**: 2 GB
- **Disk**: 60+ GB

### Named Volumes

The Dev Container uses named volumes for `node_modules` to improve performance:
- Faster file access (no bind mount overhead)
- Persisted across container rebuilds
- Automatic cache invalidation when package.json changes

### File Watching

If file watching isn't working:
```bash
# Increase inotify watches (Linux host)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Security

### Secrets Management

**DO NOT** commit secrets to `.env` file!

**Best practices**:
1. Use `.env.example` as template (committed)
2. Copy to `.env` and fill in secrets (gitignored)
3. Store secrets in password manager or vault
4. For Codespaces: Use GitHub Secrets (Settings → Codespaces → Secrets)

### SSH Keys

The Dev Container mounts your SSH keys read-only from host:
```yaml
# In docker-compose.yml
volumes:
  - ~/.ssh:/home/node/.ssh:ro
```

This allows git operations over SSH without copying keys into container.

### Docker Socket

The container has access to Docker socket for Docker-in-Docker:
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

**Security note**: This gives container full Docker daemon access. Only use in trusted development environments.

## GitHub Codespaces Specific

### Creating a Codespace

1. From repository page: Code → Codespaces → New codespace
2. Machine type: 4-core (recommended) or 8-core (for large builds)
3. Wait for build (~10 minutes first time)

### Port Forwarding

Codespaces automatically forwards ports. Access services via:
- VS Code UI: "Ports" tab shows all forwarded ports
- Click port to open in browser
- Ports are private by default (only you can access)

### Making Ports Public

In "Ports" tab:
1. Right-click port
2. Select "Port Visibility" → "Public"
3. Share URL with teammates

### Secrets in Codespaces

1. Go to: Settings → Codespaces → Secrets
2. Add secrets: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.
3. Select repository access
4. Secrets available as environment variables in Codespace

### Stopping/Deleting Codespace

**Stop** (pauses, preserves state):
- Codespaces dashboard → three dots → Stop

**Delete** (removes entirely):
- Codespaces dashboard → three dots → Delete

**Auto-stop**: Codespaces auto-stop after 30 minutes of inactivity (configurable)

## Comparison: Local vs Codespaces

| Feature | Local Dev Container | GitHub Codespaces |
|---------|---------------------|-------------------|
| **Cost** | Free (uses local resources) | ~$0.18/hour for 4-core |
| **Speed** | Depends on local hardware | Consistent cloud performance |
| **Network** | Local network speed | Fast cloud network |
| **Portability** | Requires Docker locally | Access from any browser |
| **Offline** | Works offline (once built) | Requires internet |
| **Resources** | Limited by local machine | Scalable (2-32 cores) |
| **Persistence** | Persists locally | Auto-deletes after inactivity |

## Advanced Usage

### Running Tests in Container

```bash
# Unit tests (fast)
npm test

# Integration tests (with DB)
npm run test:integration

# E2E tests (with full stack)
npm run test:e2e

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Debugging

VS Code debugger is pre-configured:
1. Set breakpoints in code
2. Press F5 or Run → Start Debugging
3. Select "Attach to Node" or "Launch Server"
4. Debugger attaches to running process

### Building for Production

```bash
# Build all
npm run build

# Build server only
cd server && npm run build

# Build client only
cd client && npm run build

# Output in dist/ directories
```

### Database Migrations

```bash
# Create new migration
cd server && npm run migrate:create -- my-migration-name

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Reset database (danger!)
npm run migrate:reset
```

## Next Steps

1. **Explore services**: Open Grafana (http://localhost:8080), Neo4j Browser (http://localhost:7474)
2. **Run tests**: `npm test` to verify everything works
3. **Start coding**: API at `server/src/`, Frontend at `client/src/`
4. **Read docs**: Check `docs/` for architecture, APIs, workflows

## Support

- **Dev Container issues**: See [VS Code Dev Containers docs](https://code.visualstudio.com/docs/devcontainers/containers)
- **Codespaces issues**: See [GitHub Codespaces docs](https://docs.github.com/en/codespaces)
- **Summit-specific**: Check `docs/devstation/README.md` or ask in `#dev-experience` Slack

## License

Copyright (c) 2026 Your Organization. All rights reserved.
