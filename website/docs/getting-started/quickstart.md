---
sidebar_position: 1
---

# 5-Minute Quickstart

Get Summit up and running in under 5 minutes using Docker.

## Prerequisites

Before you begin, ensure you have:

- **Docker Desktop** ≥ 4.0 (with 8GB+ RAM)
- **Docker Compose** ≥ 2.0
- **Node.js** ≥ 18.18
- **pnpm** ≥ 9.12 (via `corepack enable`)
- Available ports: 3000, 4000, 5432, 6379, 7474, 7687, 8080

## One-Command Startup

```bash
# Clone the repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# Bootstrap and start (one command!)
./start.sh
```

That's it! The `start.sh` script will:
1. Install pnpm dependencies
2. Set up Python virtual environment
3. Create `.env` from template
4. Start all Docker services
5. Run smoke tests to verify everything works

## Access Points

Once started, access these services:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | React application |
| **GraphQL API** | http://localhost:4000/graphql | GraphQL playground |
| **REST API** | http://localhost:4000/health | Health check endpoint |
| **Neo4j Browser** | http://localhost:7474 | Graph database UI |
| **Adminer** | http://localhost:8080 | Database admin |
| **Prometheus** | http://localhost:9090 | Metrics |
| **Grafana** | http://localhost:3001 | Dashboards |

### Default Credentials

**Neo4j:**
- Username: `neo4j`
- Password: `devpassword`

**Adminer (PostgreSQL):**
- Server: `postgres`
- Username: `summit`
- Password: `devpassword`
- Database: `summit_dev`

## Verify Installation

### 1. Check Health Endpoints

```bash
# Basic health check
curl http://localhost:4000/health

# Detailed system status
curl http://localhost:4000/health/detailed | jq

# Prometheus metrics
curl http://localhost:4000/metrics
```

### 2. Run Smoke Tests

```bash
# Automated golden path test
make smoke

# Or using npm
pnpm smoke
```

## Golden Path Demo

Test the critical workflow: **Investigation → Entities → Relationships → Copilot → Results**

### Step 1: Open Frontend

Navigate to http://localhost:3000

You should see the Summit login page with no console errors.

### Step 2: Create Investigation

1. Click "New Investigation" from the Dashboard
2. Enter a name (e.g., "Test Investigation")
3. Add a description
4. Click "Create"

**Expected:** Investigation created with unique ID in < 2 seconds

### Step 3: Add Entities

1. Open the graph explorer
2. Click "Add Entity"
3. Create a Person entity (e.g., "John Doe")
4. Create an Organization entity (e.g., "Acme Corp")
5. Link them with a "works_for" relationship

**Expected:** Graph visualizes correctly with nodes and edges

### Step 4: Run Copilot Analysis

1. Click "Run Copilot Goal"
2. Enter a goal (e.g., "Analyze connections")
3. Watch progress indicators

**Expected:** Results stream in real-time

### Step 5: View Results

1. Explore generated insights
2. Check for new discovered relationships

**Expected:** Insights appear in UI, graph updates

## Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker ps

# Check available memory
docker info | grep Memory

# Restart services
make down
make up
```

### Port Already in Use

```bash
# Find process using port 4000
lsof -i :4000

# Kill process
kill -9 <PID>
```

### Database Connection Errors

```bash
# Check database containers
docker ps | grep -E "neo4j|postgres|redis"

# View logs
docker-compose logs postgres
docker-compose logs neo4j
```

### Reset Everything

```bash
# Complete reset
make down
docker volume prune -f
make bootstrap
make up
```

## Next Steps

- 📚 [Installation Options](/docs/getting-started/installation) - Docker, local, cloud
- ⚙️ [Configuration Guide](/docs/getting-started/configuration) - Environment variables
- 📊 [First Data Import](/docs/getting-started/first-import) - CSV, STIX/TAXII
- 🔌 [API Documentation](/docs/api/overview) - GraphQL and REST APIs

## Optional: AI Capabilities

To enable AI/ML features:

```bash
# Start with AI services
./start.sh --ai

# Or manually
make up-ai
```

This adds:
- **Object Detection**: YOLO v8
- **OCR**: Tesseract, PaddleOCR
- **Speech-to-Text**: OpenAI Whisper
- **NLP**: spaCy entity recognition
- **Vector Search**: Semantic embeddings

## Need Help?

- 🐛 Found a bug? [Open an issue](https://github.com/BrianCLong/summit/issues)
- 💬 Have questions? [GitHub Discussions](https://github.com/BrianCLong/summit/discussions)
- 📖 More docs: [Installation Guide](/docs/getting-started/installation)
