# Summit MVP-4 GA Demo Pre-Demo Checklist

**Purpose:** To be executed 15 minutes before the demo begins. This checklist ensures the environment is in a known-good state, minimizing the risk of preventable failures.

---

### 1. Clean Working Tree Checks
**Goal:** Verify that the repository is clean and matches the `main` branch.

```bash
# Ensure no staged or unstaged changes
git status --porcelain=v1
# Expected output: (no output)

# Ensure no untracked files (excluding .env)
git clean -fdn
# Expected output: Would remove .env (or no output if .env doesn't exist)
```

### 2. Environment Variable Verification
**Goal:** Confirm that the `.env` file is present and contains the necessary variables.

```bash
# Check that the .env file exists
ls .env
# Expected output: .env

# Verify essential variables are set (check for at least one)
grep "NEO4J_PASSWORD" .env
# Expected output: NEO4J_PASSWORD=devpassword
```

### 3. Fast Health Check Command
**Goal:** Run a single, fast command to confirm the core toolchain is functional without starting the full stack.

```bash
# This command runs a quick test without starting services
pnpm --filter intelgraph-server test -- tests/server.test.js
# Expected output: "PASS  tests/server.test.js"
```

### 4. Cache Strategy Guidance
**Goal:** Ensure that caches do not interfere with the demo.

- **SAFE TO REUSE:**
  - `~/.pnpm-store`: The pnpm content-addressable store is safe and speeds up `pnpm install`. Do not clear it.
  - `node_modules/`: The local `node_modules` directory is safe if the `pnpm-lock.yaml` has not changed.

- **MUST BE CLEAN:**
  - **Docker State:** It is highly recommended to start with a clean Docker environment. Run `make down && docker system prune -af` before the pre-check to remove any lingering containers, networks, or volumes from previous runs.
  - **Untracked Files:** The working directory should be pristine. Run `git clean -fd` to remove any generated artifacts or logs.
