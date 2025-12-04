# 🚀 Developer Onboarding: IntelGraph in 30 Minutes

> **Goal**: Get any developer productive on IntelGraph in under 30 minutes.
> **Status**: Production-ready platform with comprehensive development environment.

## ⏱️ Quick Start (5 minutes)

### 1. **Clone & Setup** (2 minutes)

```bash
# Clone repository
git clone https://github.com/BrianCLong/summit.git
cd intelgraph-mvp

# Copy environment configuration
cp .env.example .env
# ✅ No editing needed - defaults work for development
```

### 2. **Start Everything** (3 minutes)

```bash
# Start all services (Neo4j, Postgres, Redis, API, Frontend)
make up

# ✅ Success indicators:
# - No red error messages
# - All services show "healthy" status
# - Takes ~2-3 minutes for full startup
```

## 🧪 Validate Setup (5 minutes)

### 3. **Run Smoke Tests** (2 minutes)

```bash
# Quick validation (works immediately)
node scripts/smoke-test.cjs
# ✅ Should show: "All checks passed"

# Full integration test (requires services)
make smoke
# ✅ Should complete entire golden path workflow
```

### 4. **Access Applications** (3 minutes)

Open these URLs in your browser:

| Service            | URL                           | Purpose                            |
| ------------------ | ----------------------------- | ---------------------------------- |
| **Frontend**       | http://localhost:3000         | Main IntelGraph application        |
| **GraphQL API**    | http://localhost:4000/graphql | Apollo GraphQL Playground          |
| **Neo4j Browser**  | http://localhost:7474         | Graph database (neo4j/devpassword) |
| **Postgres Admin** | http://localhost:8080         | Database admin (adminer)           |
| **Metrics**        | http://localhost:9090/metrics | Prometheus metrics                 |

✅ **Success Check**: Frontend loads and shows "Welcome to IntelGraph"

## 🛠️ Development Workflow

### **Running Tests**

```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e
```

### **Agent Interaction (Jules, etc.)**

Agents like Jules operate with specific directives. When asking an agent to work on the repo:
1.  **Reference Specifics**: Point to file paths or Feature IDs.
2.  **Traceability**: Ask agents to add `@trace` tags to new code.
3.  **Verification**: Agents are expected to run verification steps (`make smoke` or `npm test`) before submitting.

### **Traceability**

We enforce traceability links:
-   **Specs**: Define `REQ-ID`s.
-   **Code**: Use `@trace REQ-ID` in JSDocs.
-   **Tests**: Use `@trace REQ-ID` in test descriptions.

See `TRACEABILITY.md` for full details.

## 🔧 Essential Knowledge

### **Key Technologies**

-   **Frontend**: React 18, Material-UI, Cytoscape.js (graph viz)
-   **Backend**: Node.js, GraphQL, Express, Socket.IO (real-time)
-   **Databases**: Neo4j (graph), PostgreSQL (persistence), Redis (cache)

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
