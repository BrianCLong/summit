# 🛠 Summit Developer Onboarding Brief

Welcome to **Summit** — an AI-augmented intelligence analysis platform.
Our mission: **supercharge development of the MVP** while **always keeping a deployable build foremost**.

---

## 🚀 Core Philosophy

1. **Deployable First**
   - If `make up` or `make smoke` fails, **stop everything** and fix it.
   - Never merge code that breaks the golden path:
     **Investigation → Entities → Relationships → Copilot → Results**.

2. **Supercharged MVP Delivery**
   - We move fast — but with discipline.
   - Deliver roadmap features in small, tested increments.
   - Always write code that can ship today, even if the feature is partial.

---

## 🔑 Quickstart (30 Minutes to Productive)

```bash
# 1. Clone and enter repo
git clone https://github.com/BrianCLong/summit.git
cd summit

# 2. Copy environment config
cp .env.example .env

# 3. Start core environment (minimal hardware)
make bootstrap && make up

# 4. Run smoke tests (must pass!)
make smoke

# 5. Optional: Enable AI/Kafka capabilities
# make up-ai     # For AI processing
```

- 💡 **Shortcut**: run `./start.sh [--ai]` to execute `make bootstrap && make up && make smoke` with health-gate polling.
- ✅ If all green → you’re ready to develop!
- ❌ If red → fix before coding. No broken builds allowed.

---

## 📋 Golden Path Workflow

1. Create a new **Investigation**.
2. Add **Entities** and **Relationships**.
3. Import data (CSV or STIX/TAXII).
4. Run **Copilot Goal**.
5. Watch live **Events & Results** update in the graph.

👉 Every developer must be able to demo this flow at any time.

---

## 🧭 Roadmap Priorities (MVP-0 → MVP-1)

- **Phase 0:** Dev loop stabilized (Docker, Makefiles, Smoke tests). ✅
- **Phase 1:** Copilot durability (Postgres persistence). ✅
- **Phase 2:** Data ingestion (CSV + STIX/TAXII). ✅
- **Phase 3:** Security hardening (OPA policies + persisted GraphQL queries). ✅
- **Phase 4:** Observability (OpenTelemetry, Prometheus, Grafana). ⏳
- **Phase 5+:** Advanced AI analytics, OSINT connectors, temporal analysis. 🎯

---

## 🧑‍💻 Dev Workflow

### 1. Branching & Commits

- Branch format: `feature/<thing>`, `fix/<thing>`.
- Commits: **Conventional Commit** style (`feat:`, `fix:`, `chore:`, etc.).

### 2. Testing

- Run `make smoke` locally before PRs.
- Add unit + integration tests for new features.
- Expand `/scripts/smoke-test.js` if your feature touches golden path.

### 3. CI/CD

- GitHub Actions runs: lint, unit tests, smoke, image build, security scans.
- Merges blocked if **any smoke test fails**.

---

## 🛡️ Standards to Uphold

- Keep `.env.example` updated for any new variables.
- Add OpenTelemetry spans + Prometheus metrics to new services.
- Document new workflows in README or `docs/`.
- Ensure Docker/Compose stay reproducible (no “works on my machine”).
- Fix broken builds **before writing new features**.

---

## 📚 Helpful Commands

```bash
make help       # show all available commands with descriptions
make up         # start environment
make down       # stop & clean
make smoke      # full golden path smoke test (validates end-to-end)
```

💡 **Tip**: Run `make help` to see all available commands. For detailed command reference, see [docs/COMMAND_REFERENCE.md](./COMMAND_REFERENCE.md).

---

## 🔐 Environment Files & Secrets

- `.env.example` is **DEV ONLY**. Copy it to `.env` on laptops and keep the DEV-ONLY warnings intact.
- `.env.production.sample` ships with empty placeholders so Terraform, Helm, and GitHub Actions can fail fast when secrets are missing.
- When `NODE_ENV=production`, the server refuses to boot if `JWT_SECRET`, `JWT_REFRESH_SECRET`, DB passwords, or CORS origins match the sample defaults or include `localhost`.

---

## 🩺 Health & Observability

- Health probes: `curl http://localhost:4000/health`, `/health/detailed`, `/health/ready`, `/health/live`, `/metrics`.
- Prometheus + Grafana live under `observability/` and are wired into `docker-compose.dev.yml`. Grafana auto-loads the **Summit Golden Path** dashboard with the admin credentials defined in `.env`.
- `scripts/wait-for-stack.sh` waits until API/Postgres/Neo4j/Redis succeed before handing control back to `make up` (CLI and CI use the same guardrail).

---

## ✅ Acceptance Criteria for Every Contribution

- Build runs with `make up`.
- Golden path workflow succeeds.
- `make smoke` passes locally + in CI.
- Code covered by tests and instrumentation.
- Docs reflect reality.

## 🆘 Troubleshooting

### "Docker is not running"
```bash
# Check Docker status
docker info

# If failed, start Docker Desktop and try again
make up
```

### "Health checks failing"
```bash
# View detailed health status
curl http://localhost:4000/health/detailed | jq

# Check individual service logs
docker-compose logs api
docker-compose logs postgres
docker-compose logs neo4j

# Nuclear option: clean restart
make down
make up
```

### "Smoke tests failing"
```bash
# Run smoke with verbose output
pnpm smoke

# Check what failed and fix that specific step
# Golden path: Investigation → Entities → Relationships → Copilot → Results

# After fixing, validate
make smoke
```

For more help, see [docs/COMMAND_REFERENCE.md](./COMMAND_REFERENCE.md) or ask in #summit-dev.

---

> ⚡️ Remember: _Ship fast, but ship safe._
> If it can't deploy today, it doesn't merge.
