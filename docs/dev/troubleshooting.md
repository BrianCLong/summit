# 🆘 Summit Platform: Troubleshooting Guide

This guide provides solutions to common problems that you may encounter during development.

---

### **Problem: `make dev-run` fails with Docker errors.**

*   **Symptom:** You see messages like `Cannot connect to the Docker daemon` or errors related to port conflicts.

*   **Solution:**
    1.  **Ensure Docker Desktop is running.** This is the most common cause. Open Docker Desktop and make sure it's in the "running" state.
    2.  **Check for port conflicts.** Run `docker ps` to see if other containers are using the ports required by Summit (e.g., 3000, 4000, 5432). If so, stop the conflicting containers.
    3.  **Allocate sufficient memory.** Ensure Docker Desktop has at least 8GB of memory allocated in its settings.
    4.  **Perform a clean restart.** If all else fails, a "nuke and pave" approach often works:
        ```bash
        make down
        make dev-run
        ```

---

### **Problem: `make smoke` fails.**

*   **Symptom:** The smoke test script exits with a non-zero status code.

*   **Solution:**
    *   This indicates that the **"Golden Path"** is broken. This is a critical failure that must be fixed before you continue.
    1.  **Check the service logs.** The error is most likely in the `api` service. View its logs in real-time:
        ```bash
        docker-compose logs -f api
        ```
        Look for stack traces or database connection errors that occurred during the smoke test run.
    2.  **Check the detailed health of the stack.** In a separate terminal, run:
        ```bash
        curl http://localhost:4000/health/detailed | jq
        ```
        This will show you the status of the API and its database connections.
    3.  **Ensure migrations have run.** A common cause of failure is a missing database table or column. Run migrations manually to be sure:
        ```bash
        make migrate
        ```

---

### **Problem: `pre-push` hook fails and blocks your push.**

*   **Symptom:** When you try to `git push`, you see an error from Lefthook, and the push is rejected.

*   **Solution:**
    *   **This is a feature, not a bug!** The hook has detected that your code does not meet our quality standards (i.e., it fails the linting or testing checks).
    1.  **Read the error message.** The output from the failed hook will tell you exactly what went wrong (e.g., a test failed, a file is not formatted correctly).
    2.  **Fix the issue locally.**
        *   If it's a linting/formatting error, run:
            ```bash
            make dev-lint-fix
            ```
        *   If it's a test failure, run `make dev-test` and fix the failing test.
    3.  **Commit the fix.** Add your changes and commit them.
    4.  **Push again.** The `pre-push` hook will run again, and if your fix is correct, it will now pass.

---

### **Problem: VS Code shows errors for `pnpm` or other tools.**

*   **Symptom:** You see "command not found" errors in the VS Code terminal, or ESLint/Prettier extensions are not working.

*   **Solution:**
    1.  **Ensure you are inside the Dev Container.** The entire development workflow is designed to run *inside* the container. If you have opened the project folder on your local machine, none of the tools will be available.
    2.  **Check the bottom-left corner of VS Code.** It should say `Dev Container: Summit Dev Environment`.
    3.  **If you are not in the container,** use the command palette (`Ctrl+Shift+P`) and select "Dev Containers: Reopen in Container".
