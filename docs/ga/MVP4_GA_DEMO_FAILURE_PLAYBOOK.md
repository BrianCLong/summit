# Summit MVP-4 GA Demo Failure Playbook

**Purpose:** This document provides rapid diagnosis and resolution steps for the top 12 most likely failure modes during the GA demo. The goal is to maintain demo credibility by having pre-planned, operator-grade responses to common issues.

---

### 1. `pnpm install` hiccups / lockfile mismatch
- **Symptom:** The `make bootstrap` command fails with errors related to package installation, dependencies, or `pnpm-lock.yaml`.
- **Quick Diagnosis:** `git status` shows a modified `pnpm-lock.yaml`.
- **Fast Fix / Bypass:**
  1. Revert the lockfile: `git restore pnpm-lock.yaml`.
  2. Attempt a clean install: `pnpm install`.
- **Abort Criteria:** If the `pnpm install` command fails a second time, the environment is unstable. Abort the demo and state: "Our dependency state is inconsistent; we will resolve this and reschedule."

### 2. Slow or hanging unit tests
- **Symptom:** A testing step (e.g., within `make smoke`) hangs for more than 2 minutes.
- **Quick Diagnosis:** Run a single, fast test file to isolate the issue: `pnpm --filter intelgraph-server test -- tests/server.test.js`.
- **Fast Fix / Bypass:** Skip the hanging test suite by running a more targeted command.
- **Abort Criteria:** If the isolated test also hangs, a fundamental issue with the test runner or environment exists. Abort the demo.

### 3. Port binding / NO_NETWORK_LISTEN conflicts
- **Symptom:** The `make up` command fails with an error like "port is already allocated" or "address already in use".
- **Quick Diagnosis:** `lsof -i :<port_number>` (e.g., `lsof -i :3000`) to identify the conflicting process.
- **Fast Fix / Bypass:** `kill $(lsof -t -i :<port_number>)` to terminate the process.
- **Abort Criteria:** If the conflicting process is critical and cannot be killed, the demo environment is not clean. Abort.

### 4. Missing env vars / misconfigured `.env`
- **Symptom:** Services fail to start, citing missing credentials or configuration, often with a "could not connect to..." error.
- **Quick Diagnosis:** `grep -v '^#' .env` to check for missing or commented-out values.
- **Fast Fix / Bypass:** Manually set the missing variable for the current session: `export VAR_NAME=value`.
- **Abort Criteria:** If multiple core variables are missing, the `.env` file is likely corrupt. Abort the demo.

### 5. DB or graph driver unavailable
- **Symptom:** API or server logs show errors like "Connection refused" to Neo4j or PostgreSQL.
- **Quick Diagnosis:** `docker ps` to ensure the `neo4j` and `postgres` containers are running.
- **Fast Fix / Bypass:** Restart the specific container: `docker restart <container_name>`.
- **Abort Criteria:** If the container fails to restart, the Docker environment is unstable. Abort.

### 6. CI parity gap (“works locally but not CI”)
- **Symptom:** A command that passes in the demo fails in the CI pipeline (a post-demo issue).
- **Quick Diagnosis:** N/A during the demo itself. This is a post-mortem analysis.
- **Fast Fix / Bypass:** The demo is successful; the follow-up is to align the CI environment with the local setup.
- **Abort Criteria:** N/A.

### 7. Demo data missing / fixture drift
- **Symptom:** The `make smoke` command fails with an assertion error, often indicating that expected data was not found.
- **Quick Diagnosis:** Check if the seed data exists: `ls server/db/seeds/`.
- **Fast Fix / Bypass:** Re-seed the database: `pnpm run db:seed`.
- **Abort Criteria:** If seeding fails, the database schema may have drifted. Abort the demo.

### 8. Build tool mismatch (node/pnpm version)
- **Symptom:** Commands fail with errors related to syntax or unsupported features, often mentioning Node.js or pnpm version.
- **Quick Diagnosis:** `node -v` and `pnpm -v`. Compare against the versions in `README.md` or `.tool-versions`.
- **Fast Fix / Bypass:** If a version manager like `nvm` or `fnm` is available, switch to the correct version (e.g., `nvm use`).
- **Abort Criteria:** If the correct versions cannot be installed, the environment is not properly configured. Abort.

### 9. Permission / filesystem issues
- **Symptom:** Scripts fail with "Permission denied" when trying to read or write files.
- **Quick Diagnosis:** `ls -la <file_path>` to check ownership and permissions.
- **Fast Fix / Bypass:** `sudo chown -R $(whoami) .` to reclaim ownership.
- **Abort Criteria:** If `sudo` is not available or does not resolve the issue, the environment is fundamentally misconfigured. Abort.

### 10. “Unexpected untracked file” hygiene break
- **Symptom:** `git status` shows untracked files that are not in `.gitignore`.
- **Quick Diagnosis:** `git status`.
- **Fast Fix / Bypass:** Remove the untracked files: `git clean -fd`.
- **Abort Criteria:** If untracked files are critical and cannot be deleted, the working directory is not clean. Abort the demo.

### 11. Rendering/route failure in UI
- **Symptom:** The UI (if shown) fails to load or shows a blank page.
- **Quick Diagnosis:** Open the browser's developer console and check for JavaScript errors.
- **Fast Fix / Bypass:** Perform a hard refresh (Cmd+Shift+R or Ctrl+F5) to clear the cache.
- **Abort Criteria:** If errors persist after a hard refresh, the frontend build is likely broken. Abort the UI portion of the demo.

### 12. Evidence script output format changes
- **Symptom:** A script that is supposed to generate a JSON or XML report fails or produces malformed output.
- **Quick Diagnosis:** N/A during the demo, as this would be caught by CI.
- **Fast Fix / Bypass:** N/A. The demo relies on the "Golden Path," not on individual evidence scripts.
- **Abort Criteria:** N/A.
