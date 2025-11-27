# 🛠️ Summit Platform: Developer Onboarding Guide

**Objective:** To provide a single, canonical path to get any developer from a fresh clone to a productive, running environment in under 15 minutes.

**Core Philosophy:** The Summit project operates under a **"Deployable First"** principle. This means the `main` branch must *always* be in a state that can be deployed. Our entire development workflow is designed to protect this invariant.

---

### 1. The Golden Path: Your First Priority

Before writing a single line of code, you must be able to run and verify the **"Golden Path"**. This is the critical end-to-end workflow that validates the core functionality of the platform. It is:

**Investigation → Entities → Relationships → Copilot → Results**

The `make smoke` command automates this validation. If it fails, you must stop and fix it before proceeding.

---

### 2. Environment Setup: The One True Way

The Summit project uses a **Dev Container** to ensure a perfectly reproducible, consistent development environment for every developer, every CI run, and every agent.

**Prerequisites:**
*   **Docker Desktop ≥ 4.x**: Must be running with at least 8GB of memory allocated.
*   **Visual Studio Code**: With the [Dev Containers extension](https of://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) installed.

**Setup Steps:**

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/BrianCLong/summit.git
    cd summit
    ```
2.  **Open in Dev Container:**
    *   Open the cloned repository folder in VS Code.
    *   A notification will appear: "Reopen in Container". Click it.
    *   VS Code will now build the Docker image and configure your environment. This may take several minutes on the first run.
3.  **Bootstrap the Project:**
    *   Once the Dev Container is loaded, open the integrated terminal in VS Code (`Ctrl+``).
    *   Run the canonical setup command:
        ```bash
        make dev-setup
        ```
    *   This command will install all `pnpm` dependencies and create your local `.env` file.
4.  **Start the Services:**
    *   Start all backend services (API, databases, etc.) in the background:
        ```bash
        make dev-run
        ```
5.  **Verify the Golden Path:**
    *   Run the automated smoke tests:
        ```bash
        make smoke
        ```

✅ If `make smoke` passes with no errors, your environment is correctly configured, and you are ready to begin development.

---

### 3. Daily Development Workflow

*   **Run Linters & Tests:** Before pushing any code, always run the quality gates:
    ```bash
    make dev-lint
    make dev-test
    ```
    *(Note: These checks are also run automatically by a `pre-push` Git hook, but running them manually provides a faster feedback loop.)*

*   **Stop Services:** When you are finished working, stop all services:
    ```bash
    make down
    ```

*   **Explore all commands:** For a full list of available commands and their descriptions, run:
    ```bash
    make help
    ```

For more detailed information on the project's architecture, tooling, and troubleshooting, please refer to the other documents in this `docs/dev/` directory.
