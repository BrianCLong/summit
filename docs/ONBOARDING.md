# 🛠 IntelGraph Developer Onboarding Brief

Welcome to **IntelGraph** — an AI-augmented intelligence analysis platform.  
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
# make up-kafka  # For streaming
# make up-full   # For both AI + Kafka
```

* ✅ If all green → you’re ready to develop!
* ❌ If red → fix before coding. No broken builds allowed.

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

* **Phase 0:** Dev loop stabilized (Docker, Makefiles, Smoke tests). ✅
* **Phase 1:** Copilot durability (Postgres persistence). ✅
* **Phase 2:** Data ingestion (CSV + STIX/TAXII). ✅
* **Phase 3:** Security hardening (OPA policies + persisted GraphQL queries). ✅
* **Phase 4:** Observability (OpenTelemetry, Prometheus, Grafana). ⏳
* **Phase 5+:** Advanced AI analytics, OSINT connectors, temporal analysis. 🎯

---

## 🧑‍💻 Dev Workflow

### 1. Branching & Commits

* Branch format: `feature/<thing>`, `fix/<thing>`.
* Commits: **Conventional Commit** style (`feat:`, `fix:`, `chore:`, etc.).

### 2. Testing

* Run `make smoke` locally before PRs.
* Add unit + integration tests for new features.
* Expand `/scripts/smoke-test.js` if your feature touches golden path.

### 3. CI/CD

* GitHub Actions runs: lint, unit tests, smoke, image build, security scans.
* Merges blocked if **any smoke test fails**.

---

## 🛡️ Standards to Uphold

* Keep `.env.example` updated for any new variables.
* Add OpenTelemetry spans + Prometheus metrics to new services.
* Document new workflows in README or `docs/`.
* Ensure Docker/Compose stay reproducible (no “works on my machine”).
* Fix broken builds **before writing new features**.

---

## 📚 Helpful Commands

```bash
make up         # start environment
make down       # stop & clean
make seed       # load demo data
make smoke      # full golden path smoke test
make smoke-lite # simplified validation (fast)
```

---

## ✅ Acceptance Criteria for Every Contribution

* Build runs with `make up`.
* Golden path workflow succeeds.
* `make smoke` passes locally + in CI.
* Code covered by tests and instrumentation.
* Docs reflect reality.

---

> ⚡️ Remember: *Ship fast, but ship safe.*
> If it can’t deploy today, it doesn’t merge.
