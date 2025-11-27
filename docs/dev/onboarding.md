# 🛠 Summit Developer Onboarding Guide

Welcome to **Summit** — an AI-augmented intelligence analysis platform. This guide provides a single, canonical path for setting up your development environment.

**Core Philosophy:** Our primary directive is **Deployable First**. The `main` branch must always be in a state that can be deployed. This means the automated "golden path" workflow must pass before any code is merged.

---

## 🚀 Quickstart (Go from clone to running app in minutes)

This is the **one true way** to set up your local development environment.

**1. Prerequisites:**

*   **Docker Desktop ≥ 4.x**: Must be running with at least 8GB of memory allocated.
*   **Node.js ≥ 18**: We use `pnpm` for package management.
*   **pnpm ≥ 9**: Enabled via `corepack enable`.
*   **Python ≥ 3.11**: For scripts and tooling.

**2. Canonical Setup Commands:**

These commands are your source of truth for managing the local development lifecycle.

```bash
# First time setup: installs all dependencies, sets up .env file
make dev-setup

# Start all services (API, UI, databases, etc.)
make dev-run

# Run the core test suite (unit, integration, etc.)
make dev-test

# Run lint and format checks
make dev-lint

# Stop all running services
make down
```

**3. Your First Run:**

Follow these steps exactly to get started.

```bash
# Clone the repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# Install dependencies and configure the environment
make dev-setup

# Start all services in the background
make dev-run

# Run the smoke tests to verify the golden path is working
make smoke
```

*   ✅ If `make smoke` passes, you are ready to start developing.
*   ❌ If any step fails, stop and debug. See the "Troubleshooting" section below.

---

## 🧭 The Golden Path

The "Golden Path" is the critical end-to-end workflow that **must always work**. It is:

**Investigation → Entities → Relationships → Copilot → Results**

The `make smoke` command automates the validation of this path using the seeded dataset located in `data/golden-path/demo-investigation.json`. Every developer must be able to manually step through this workflow and verify its success.

**Service Endpoints:**
*   **Frontend**: http://localhost:3000
*   **GraphQL API**: http://localhost:4000/graphql
*   **Neo4j Browser**: http://localhost:7474
*   **Adminer (DB Admin)**: http://localhost:8080
*   **Grafana Dashboards**: http://localhost:3001

---

## 🧑‍💻 Daily Development Workflow

1.  **Create a feature branch:** `git checkout -b feature/my-new-thing`
2.  **Write code:** Make your changes.
3.  **Run tests and linters:**
    ```bash
    make dev-test
    make dev-lint
    ```
4.  **Verify the golden path:** `make smoke`
5.  **Commit your changes:** Use [Conventional Commits](https://www.conventionalcommits.org/) format (e.g., `feat: add new widget`).
6.  **Push and open a Pull Request.**

---

## 🆘 Troubleshooting

*   **`make dev-run` fails:**
    *   Ensure Docker Desktop is running and has sufficient memory.
    *   Check for port conflicts using `docker ps`.
    *   View logs for a specific service: `docker-compose logs api`.
    *   As a last resort, restart everything: `make down && make dev-run`.
*   **`make smoke` fails:**
    *   This indicates the core workflow is broken. **Fix this before writing new code.**
    *   Check the detailed health status: `curl http://localhost:4000/health/detailed | jq`.
    *   Review service logs (`docker-compose logs api`) for errors during the test run.
*   **Database migration issues:**
    *   Ensure services are running with `make dev-run`.
    *   Run migrations manually: `make migrate`.
    *   Check the postgres logs: `docker-compose logs postgres`.

---

## 📚 Helpful Commands

*   `make help`: Show a list of all available `make` commands.
*   `make down`: Stop all running Docker containers.
*   `make up-ai`: Start the stack with optional AI/ML services (requires more resources).
*   `make migrate`: Manually run database migrations.
