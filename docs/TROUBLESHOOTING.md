# Troubleshooting Runbook

This runbook covers common issues encountered during development and deployment of the Summit Platform.

Companion to the [Deployment Quick Start Guide](./DEPLOYMENT.md) and [Environment Configuration Reference](./ENV-CONFIG.md).

## 1. Port Already in Use

**Symptom:** `EADDRINUSE` error when starting the server or docker containers.
**Detection:**
```bash
lsof -i :3000  # Check UI port
lsof -i :4000  # Check API port
lsof -i :5432  # Check Postgres port
```
**Resolution:**
- Stop the conflicting process: `kill -9 <PID>`
- Or, change the port in `.env` and `docker-compose.yml`.

## 2. Package Installation Fails

**Symptom:** `npm install` fails with dependency conflicts or permission errors.
**Resolution:**
- Ensure you are using the correct Node version (`node -v`).
- Clear cache: `npm cache clean --force`.
- Remove `node_modules` and lockfile, then reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- If using `pnpm`, run `pnpm install`.

## 3. Pre-commit Hook Timeouts

**Symptom:** Commits fail because the pre-commit hook takes too long.
**Root Cause:** Large files or slow linting processes.
**Resolution:**
- Run linting manually to identify specific errors: `npm run lint`.
- Bypass hooks (use sparingly): `git commit -m "msg" --no-verify`.

## 4. Screenshot Generation Fails

**Symptom:** Playwright fails to capture screenshots during tests.
**Resolution:**
- Ensure playwright browsers are installed: `npx playwright install`.
- Run in headed mode to debug: `npx playwright test --headed`.

## 5. GitHub Actions Workflow Not Triggering

**Symptom:** Pushing code does not start the CI job.
**Root Cause:**
- Syntax error in `.github/workflows/`.
- Branch protection rules.
- Path filtering (workflow only triggers on changes to specific paths).
**Resolution:**
- Check the "Actions" tab for parsing errors.
- Verify the `on:` section in the YAML file matches your branch/event.

## 6. Helm Chart Validation Errors

**Symptom:** `helm install` fails with template errors.
**Detection:**
```bash
helm template charts/ig-platform --debug
```
**Resolution:**
- Check indentation in `values.yaml`.
- Verify required values are provided.

## 7. Canary Deployment Stuck

**Symptom:** Canary rollout pauses or does not promote.
**Root Cause:** Health checks failing or analysis metrics below threshold.
**Resolution:**
- Check the rollout status: `kubectl rollout status deployment/api-canary`.
- Check logs: `kubectl logs -l app=api,track=canary`.
- Abort canary: `kubectl rollout undo deployment/api`.
