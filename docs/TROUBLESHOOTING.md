# Troubleshooting Guide

This guide compiles common issues and solutions for developers working on Summit.

For the comprehensive local developer experience guide (quick start, CLI reference, and smoke test workflow) see [`docs/DEVELOPMENT_SETUP.md`](./DEVELOPMENT_SETUP.md).

## Common Issues

### 1. "Docker daemon not running"

**Error**: `Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?`
**Solution**: Start Docker Desktop or the Docker service (`sudo service docker start` on Linux).

### 2. Services fail to start (Port conflicts)

**Error**: `Bind for 0.0.0.0:5432 failed: port is already allocated`
**Solution**:

- Check if another service (like a local Postgres) is using the port.
- Stop the conflicting service.
- Or, change the port mapping in `docker-compose.yaml` (e.g., `"5433:5432"`).

### 3. "Neo4j Connection Failed"

**Error**: `Neo4jError: Connection refused` or authentication failure.
**Solution**:

- Ensure Neo4j container is healthy (`docker compose ps`).
- Check `.env` matches the container credentials (`devpassword`).
- Wait a few seconds; Neo4j takes longer to start than other services.

### 4. `turbo` command not found

**Error**: `sh: turbo: command not found`
**Solution**:

- The environment might lack global `turbo`.
- Run commands from the sub-package directly (e.g., `cd client && npm run dev`).
- Or install deps: `npm install`.

### 5. ESM / Import Errors in Tests

**Error**: `SyntaxError: Cannot use import statement outside a module`
**Solution**:

- We use a mix of ESM and CommonJS.
- Ensure you are running tests with the correct config.
- Use `npm run test:unit` which sets up the environment correctly.

### 6. "Permission denied" in scripts

**Error**: `./scripts/smoke-test.js: Permission denied`
**Solution**:

- Make the script executable: `chmod +x scripts/smoke-test.js`
- Or run with node: `node scripts/smoke-test.js`

## Debugging Tips

- **Logs**: Use `make logs` or `docker compose logs -f [service]` to see real-time output.
- **Inspector**: You can attach a debugger to the Node.js process if you expose port 9229 in `docker-compose.yaml`.
- **Clean State**: If data is corrupted, run `make clean` to wipe volumes and restart.

## Getting Help

If you are still stuck:

1.  Check the `docs/` folder.
2.  Search existing GitHub Issues.
3.  Ask in the team chat.
