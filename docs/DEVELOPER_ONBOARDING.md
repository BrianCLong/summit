# 🚀 Developer Onboarding: IntelGraph in 30 Minutes

> **Goal**: Get any developer productive on IntelGraph in under 30 minutes.
> **Status**: Production-ready platform with comprehensive development environment.

## ⏱️ Quick Start (5 minutes)

### 1. **Clone & Setup** (2 minutes)

```bash
# Clone repository
git clone https://github.com/BrianCLong/summit.git
cd intelgraph

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
node scripts/smoke-test-simple.js
# ✅ Should show: "5/5 tests passing (100% success rate)"

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

## 🎯 Golden Path Demo (10 minutes)

### 5. **Create Your First Investigation** (3 minutes)

1. Go to http://localhost:3000
2. Click **"Start Golden Path Wizard"** (if available) OR
3. Navigate to **Investigations** → **Create New**
4. Fill in:
   - Name: "My First Investigation"
   - Description: "Learning IntelGraph"
   - Type: "Threat Analysis"

### 6. **Add Entities & Relationships** (4 minutes)

1. In your investigation, click **"Add Entity"**
2. Create entities:
   - **Person**: "John Doe" (suspect)
   - **Organization**: "ACME Corp" (target)
   - **Location**: "San Francisco" (location)
3. Click **"Add Relationship"**:
   - **John Doe** → **WORKS_FOR** → **ACME Corp**
   - **ACME Corp** → **LOCATED_IN** → **San Francisco**

### 7. **Run AI Copilot** (3 minutes)

1. Click **"Copilot"** tab
2. Click **"Start New Run"**
3. Enter goal: "Find connections and analyze relationships"
4. Watch real-time progress in the Copilot panel
5. ✅ **Success**: See live events and task completion

## 🛠️ Development Workflow (10 minutes)

### 8. **Development Commands** (3 minutes)

```bash
# Essential commands you'll use daily:
make up                    # Start development environment
make down                  # Stop all services
make logs                  # View service logs
make smoke                 # Run full test suite
make seed                  # Load demo data
```

### 9. **Code Structure** (4 minutes)

```
intelgraph/
├── client/               # React frontend
│   ├── src/components/   # UI components
│   └── src/hooks/        # Custom React hooks
├── server/               # Node.js backend
│   ├── src/graphql/      # GraphQL schema & resolvers
│   ├── src/copilot/      # AI orchestration
│   ├── src/monitoring/   # Observability (metrics, tracing)
│   └── src/policies/     # Security policies (OPA)
├── scripts/              # Development & deployment scripts
└── docs/                 # Documentation
```

### 10. **Making Changes** (3 minutes)

```bash
# Start development with hot reload
npm run dev               # In separate terminal

# Make changes to files:
# - Frontend: client/src/ (React hot reload)
# - Backend: server/src/ (Nodemon auto-restart)
# - Policies: server/policies/ (OPA validation)

# Validate changes
make smoke                # Ensure no regressions
```

## 🔧 Essential Knowledge

### **What is IntelGraph?**

- **Intelligence Analysis Platform**: Graph-based investigation tool
- **AI-Augmented**: Copilot assists with analysis and insights
- **Real-time**: Live collaboration and updates
- **Production-Ready**: Enterprise security, observability, performance

### **Key Technologies**

- **Frontend**: React 18, Material-UI, Cytoscape.js (graph viz)
- **Backend**: Node.js, GraphQL, Express, Socket.IO (real-time)
- **Databases**: Neo4j (graph), PostgreSQL (persistence), Redis (cache)
- **Security**: OPA policies, JWT auth, RBAC
- **Monitoring**: OpenTelemetry, Prometheus, Grafana

### **Core Concepts**

- **Investigations**: Containers for analysis work
- **Entities**: People, organizations, locations, assets
- **Relationships**: Connections between entities
- **Copilot Runs**: AI-assisted analysis sessions
- **Golden Path**: Complete workflow from data to insights

## 🚨 Troubleshooting (If Needed)

### **Services Won't Start**

```bash
# Clean reset
make down && make clean && make up

# Check specific service logs
docker compose logs neo4j
docker compose logs postgres
docker compose logs server
```

### **Smoke Tests Failing**

```bash
# Check service health
docker compose ps

# Try simple test first
node scripts/smoke-test-simple.js

# Reset demo data
make seed
```

### **Frontend Not Loading**

```bash
# Check if API is running
curl http://localhost:4000/graphql

# Restart just frontend
docker compose restart client
```

## 📚 Next Steps

### **Immediate Actions** (after onboarding)

1. ✅ **Bookmark Key URLs**: Frontend, GraphQL Playground, Neo4j Browser
2. ✅ **Join Team Chat**: Get access to development discussions
3. ✅ **Review Architecture**: Read `docs/ARCHITECTURE.md`
4. ✅ **Check Issues**: Look at GitHub Issues for current priorities

### **First Week Goals**

- [ ] Complete a small bug fix or documentation improvement
- [ ] Run the full test suite and understand coverage
- [ ] Explore the GraphQL schema in the playground
- [ ] Create a test investigation with real data
- [ ] Set up your preferred IDE with TypeScript support

### **Development Resources**

- 📖 **Master Prompt**: `docs/MASTER_PROMPT.md` (development philosophy)
- 🏗️ **Architecture**: `docs/ARCHITECTURE.md` (system design)
- 🔒 **Security**: `server/policies/` (OPA policy examples)
- 🧪 **Testing**: `scripts/smoke-test.js` (comprehensive test examples)
- 📊 **Monitoring**: `monitoring/grafana-dashboard.json` (observability)

## 🎯 Success Criteria

**You're ready to contribute when:**

- ✅ `make up && make smoke` completes successfully
- ✅ You can create investigations and run Copilot analysis
- ✅ You understand the code structure and key technologies
- ✅ You know how to make changes and validate them
- ✅ You can troubleshoot common issues independently

## 🆘 Getting Help

**Immediate Support:**

- 🔧 **Technical Issues**: Check `docker compose logs [service]`
- 📚 **Documentation**: Complete guides in `docs/` directory
- 🧪 **Validation**: Use smoke tests for quick debugging
- 💬 **Team Support**: Team chat or GitHub Discussions

**Remember**: IntelGraph is production-ready. The development environment should "just work" - if something's broken, it's likely a real issue that affects everyone.

---

**Welcome to the IntelGraph team! 🎉**

_You're now equipped to build next-generation intelligence analysis capabilities._
