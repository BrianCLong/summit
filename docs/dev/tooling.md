# _Summit Platform: Tooling & Commands_

This document provides a comprehensive reference for the tools, commands, and scripts used in the Summit development ecosystem.

---

### _1. The Canonical Entrypoint: `Makefile`_

The root `Makefile` is the **single source of truth** for all development, testing, and operational tasks. It is designed to be self-documenting and provides a consistent, high-level interface over the underlying tooling.

**Always prefer `make` commands over raw `pnpm` or `docker` commands for day-to-day work.**

To see a full list of all available commands and their descriptions, run:
```bash
make help
```

**Key Commands:**
*   `make dev-setup`: Your first command on a fresh clone. Installs all dependencies.
*   `make dev-run`: Starts all services required for local development.
*   `make dev-test`: Runs the entire test suite.
*   `make dev-lint`: Checks for and reports any linting or formatting issues.
*   `make dev-lint-fix`: Automatically fixes all fixable linting and formatting issues.
*   `make smoke`: Runs the critical "Golden Path" smoke tests.
*   `make down`: Stops all running services.

---

### _2. Reproducible Environments: Dev Containers_

To eliminate "works on my machine" problems, the Summit project uses **Visual Studio Code Dev Containers**. This ensures that every developer—and every CI run—operates in an identical, perfectly reproducible environment.

*   **Configuration:** The environment is defined in the `.devcontainer/` directory.
    *   `devcontainer.json`: Specifies the VS Code extensions, settings, and container orchestration.
    *   `Dockerfile`: Defines the base Linux image and all system-level dependencies.
*   **Usage:** Simply open the project folder in VS Code and select "Reopen in Container".

---

### _3. Quality Gates: Lefthook Git Hooks_

To ensure that no broken or non-compliant code is ever pushed to the repository, we use **Lefthook** to manage our Git hooks.

*   **Configuration:** `lefthook.yml` in the project root.
*   **Key Hooks:**
    *   `pre-commit`: Runs extremely fast checks (like `lint-staged`) on the files you're about to commit.
    *   `pre-push`: Runs the full, comprehensive quality suite (`make dev-lint` and `make dev-test`) before your code is allowed to be pushed to the remote repository. This is our primary line of defense for maintaining a green `main` branch.

You do not need to install or configure anything for this to work; it is automatically set up when you run `make dev-setup`.

---

### _4. Package Management: `pnpm`_

We use `pnpm` as our package manager for its speed and efficient handling of disk space in a monorepo.

*   **Installation:** `pnpm` is installed automatically within the Dev Container.
*   **Usage:** While you can run `pnpm` commands directly, always prefer the `make` targets (`make dev-test`, `make dev-lint`, etc.) as they ensure the correct environment and configuration.

---

### _5. Container Orchestration: Docker Compose_

All of our services are defined and managed using Docker Compose.

*   **Configuration:** `docker-compose.dev.yml` defines the services, networks, and volumes for the local development environment.
*   **Usage:** The `make dev-run` and `make down` commands are high-level wrappers around `docker-compose`. For more advanced debugging, you can use `docker-compose` directly:
    ```bash
    # View the logs of a specific service
    docker-compose logs -f api

    # Access a shell inside a running container
    docker-compose exec api /bin/bash
    ```
