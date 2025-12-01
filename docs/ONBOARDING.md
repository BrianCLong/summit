# ⚡️ Summit Developer Onboarding: The 10-Minute Golden Path

**Goal:** Go from `git clone` to a fully verified, running environment in **under 10 minutes**.

> **🛑 Stop!** Do you have the prerequisites?
> - **Docker Desktop** (Running, ≥ 8GB RAM allocated)
> - **Node.js** (≥ v18)
> - **pnpm** (≥ v9, enable with `corepack enable`)
> - **Make**

---

## 🚀 Quick Start (The Golden Path)

Run these **4 commands** in order. If any fail, stop and check [Troubleshooting](#-troubleshooting-faq).

```bash
# 1. Clone the repository
git clone https://github.com/BrianCLong/summit.git && cd summit

# 2. Bootstrap dependencies & secrets (approx. 2 mins)
make bootstrap

# 3. Start the stack (approx. 2-5 mins)
make up

# 4. Verify everything works (approx. 1 min)
make smoke
```

### 🎉 Definition of Done
If `make smoke` prints **"All smoke tests passed!"**, you are ready to code.
- **UI:** [http://localhost:3000](http://localhost:3000)
- **API:** [http://localhost:4000/graphql](http://localhost:4000/graphql)

---

## 🛠️ Common Tasks

| Goal | Command |
| :--- | :--- |
| **Start Environment** | `make up` |
| **Stop Environment** | `make down` |
| **Reset Everything** (Nuclear Option) | `make clean && make bootstrap && make up` |
| **Run Tests** | `npm test` (Unit) or `make smoke` (E2E) |
| **View Logs** | `docker compose logs -f api` |

---

## ❓ Troubleshooting FAQ (Single-Command Fixes)

**Q: "Docker is not running" or connection refused?**
**A:** `open -a Docker` (macOS) or start Docker Desktop manually.

**Q: "Missing dependencies" or weird build errors?**
**A:** `make bootstrap`

**Q: Containers are unhealthy or stuck?**
**A:** `make down && make up`

**Q: "Address already in use" (Port 3000/4000/5432)?**
**A:** `lsof -ti:4000 | xargs kill -9` (Replace port number as needed)

**Q: Database/Migrations seem broken?**
**A:** `make db-reset` (Warning: deletes all local data)

**Q: Tests are flaky or failing mysteriously?**
**A:** `make smoke` (Runs the canonical verification suite)

---

## 📚 Next Steps

1. **Activate Features:** See [Admin Configuration](./ADMIN-CONFIG.md) to tweak settings.
2. **Explore the Graph:** Go to the "Investigation" tab in the UI.
3. **Read the Manual:** Check [COMMAND_REFERENCE.md](./COMMAND_REFERENCE.md) for advanced usage.
