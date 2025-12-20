# 🚀 Summit: 10-Minute Developer Onboarding

Welcome to the Summit Platform! This guide will get you from a fresh `git clone` to a running, validated local environment in under 10 minutes.

Our core principle is **Deployable First**: if the local environment is broken, we stop and fix it. Every developer is a guardian of the golden path.

> 📚 **AI Assistants:** For deep context, conventions, and architecture, see [`CLAUDE.md`](../CLAUDE.md).

---

### ✅ Step 1: Validate Your Local Environment

Before you begin, run the environment validator to ensure your machine has the required dependencies and available ports. This script checks for Docker, Node.js, pnpm, Python, and verifies that critical ports are free.

```bash
./scripts/validate-env.sh
```

If the script reports any failures, resolve them before proceeding. Common issues include:
- **Docker not running**: Start Docker Desktop.
- **Missing dependencies**: Install the required versions (Node 18+, pnpm 9+, Python 3.11+).
- **Port conflicts**: Shut down services using ports 3000, 4000, 5432, 6379, 7474, 7687, or 8080.

---

### 📦 Step 2: Bootstrap and Start the Platform

The `start.sh` script is your golden path to a running environment. It automates dependency installation, environment file setup, Docker container startup, and initial health checks.

```bash
./start.sh
```
This single command will:
1.  **Run Validator**: Execute the environment check from Step 1.
2.  **Install Dependencies**: Run `pnpm install` for all workspace packages.
3.  **Create `.env`**: Copy `.env.example` to `.env` if it doesn't exist.
4.  **Launch Services**: Start the entire stack (API, UI, databases, etc.) using Docker Compose.
5.  **Run Migrations & Seeds**: Apply database migrations and seed the `quickstart-investigation` dataset.
6.  **Run Smoke Test**: Automatically validate the core workflow against the seeded data.

When the script finishes, you will have a fully functional development environment.

- **Optional AI Stack**: To include AI/ML services, run `./start.sh --ai`.
- **Manual Mode**: If you prefer, you can run the steps manually: `make bootstrap`, `make up`, and `make smoke`.

---

### 🔬 Step 3: Explore the Golden Path Workflow

The smoke test in the previous step already validated the core application workflow. Now, walk through it yourself to understand the user experience.

**Golden Path**: **Investigation → Entities → Relationships → Copilot → Results**

1.  **Open the Frontend**: Navigate to **http://localhost:3000**.
2.  **Find the Demo Investigation**: On the dashboard, you'll find the pre-seeded "Quickstart Investigation". Click to open it.
3.  **Explore the Graph**:
    - The graph explorer will display entities and relationships from the `quickstart-investigation` dataset.
    - Click on nodes and edges to see their properties.
    - Use the layout tools to rearrange the graph.
4.  **Run the Copilot**:
    - In the investigation panel, click the "Run Copilot Goal" button.
    - This will trigger an AI-driven analysis based on a predefined goal for the dataset.
5.  **View the Results**:
    - Observe as the Copilot streams its findings into the results panel.
    - The graph may update in real time with newly discovered entities or relationships.

This workflow is the backbone of the Summit platform. `make smoke` automates these exact steps, ensuring that our core functionality is always working.

---

### 🧑‍💻 Your First Commit: Development Workflow

Now that your environment is running and validated, you're ready to contribute.

1.  **Create a Branch**: Use the format `feature/<thing>` or `fix/<thing>`.
    ```bash
    git checkout -b feature/my-new-feature
    ```
2.  **Write Code**: Make your changes to the codebase. The `client/` and `server/` directories are the primary application folders.
3.  **Run Tests**: Before committing, run local checks.
    ```bash
    make smoke      # Always run the smoke test
    pnpm test       # Run unit/integration tests
    pnpm lint       # Check for linting errors
    ```
4.  **Commit Your Changes**: Use the [Conventional Commits](https://www.conventionalcommits.org/) format.
    ```bash
    git commit -m "feat: add user profile page"
    ```
5.  **Open a Pull Request**: Push your branch to GitHub and create a PR against `main`. Ensure all CI checks pass.

---

### 🛠️ Helpful Commands

- `make help`: Display all available `make` commands.
- `make up`: Start all services.
- `make down`: Stop and remove all services.
- `make smoke`: Run the end-to-end smoke test.
- `pnpm test`: Run unit and integration tests.
- `docker-compose logs -f <service-name>`: Tail logs for a specific service (e.g., `api`, `client`).

---

### 🆘 Troubleshooting

- **`make smoke` fails**: Run `pnpm smoke` for a more detailed, verbose output to pinpoint the failure.
- **Health checks failing**: Use `curl http://localhost:4000/health/detailed | jq` to see the status of all backend services.
- **Docker issues**: A clean restart often helps. Run `make down` followed by `./start.sh`.

For more detailed guides, see the [documentation index](./README.md). Welcome to the team!
