# 🚀 Developer Onboarding: IntelGraph in 30 Minutes

> **Goal**: Get any developer productive on IntelGraph in under 30 minutes.
> **Status**: Production-ready platform with comprehensive development environment.

## ⏱️ Quick Start (5 minutes)

### 1. **Clone & prime environment** (2 minutes)

```bash
# Clone repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# Ensure base env exists (script copies .env.example if missing)
scripts/onboarding/compose-presets.sh ps minimal || true
```

### 2. **Start an isolated stack** (3 minutes)

```bash
# Full preset: datastore + UI/API services, isolated under project name "summit-onboarding"
scripts/onboarding/compose-presets.sh up full

# ✅ Success indicators:
# - Docker shows containers with "Up" status for postgres/neo4j/redis/ui/gateway
# - No red error messages in logs (use scripts/onboarding/compose-presets.sh logs full)
# - First start takes ~2-3 minutes
```

### 3. **Run smoke checks** (under 5 minutes)

```bash
# Lightweight API/UI verification
make dev-smoke COMPOSE_DEV_FILE=docker-compose.dev.yaml

# Optional full-path validation after first boot
node scripts/smoke-test.cjs
make smoke
```

### 4. **Access applications** (3 minutes)

Open these URLs in your browser:

| Service           | URL                           | Purpose                         |
| ----------------- | ----------------------------- | ------------------------------- |
| **Frontend**      | http://localhost:3000         | Main IntelGraph application     |
| **Gateway API**   | http://localhost:8080/health  | API health probe                |
| **GraphQL API**   | http://localhost:4000/graphql | Apollo GraphQL Playground       |
| **Neo4j Browser** | http://localhost:7474         | Graph database (neo4j/password) |
| **Postgres**      | localhost:5432                | Database endpoint               |

✅ **Success Check**: Frontend loads and shows "Welcome to IntelGraph"

## 🛠️ Development Workflow

### **Running Tests**

```bash
# Run unit tests
pnpm test

# Run e2e tests
pnpm run test:e2e
```

### **Agent Interaction (Jules, etc.)**

Agents like Jules operate with specific directives. When asking an agent to work on the repo:

1.  **Reference Specifics**: Point to file paths or Feature IDs.
2.  **Traceability**: Ask agents to add `@trace` tags to new code.
3.  **Verification**: Agents are expected to run verification steps (`make smoke` or `npm test`) before submitting.

### **Traceability**

We enforce traceability links:

- **Specs**: Define `REQ-ID`s.
- **Code**: Use `@trace REQ-ID` in JSDocs.
- **Tests**: Use `@trace REQ-ID` in test descriptions.

See `TRACEABILITY.md` for full details.

## 🔧 Essential Knowledge

### **Key Technologies**

- **Frontend**: React 18, Material-UI, Cytoscape.js (graph viz)
- **Backend**: Node.js, GraphQL, Express, Socket.IO (real-time)
- **Databases**: Neo4j (graph), PostgreSQL (persistence), Redis (cache)

### **Directory Structure**

```
intelgraph-mvp/
├── client/               # React frontend
├── server/               # Node.js backend
├── scripts/              # Development & deployment scripts
└── docs/                 # Documentation
```

## 🚨 Troubleshooting

See `docs/TROUBLESHOOTING.md` (if available) or check `docker compose logs`.
