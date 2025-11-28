# Production Deployment Runbook

This runbook turns the existing deployment assets into a repeatable, evidence-friendly procedure for promoting Summit to production. It assumes the staging environment is healthy and that Helm charts and docker images are already published.

## Roles and communication
- **Release manager:** approves the change window, owns the rollback decision.
- **Operator on-call:** executes commands and captures logs.
- **Observer:** verifies monitoring/alerts and validates dashboards.
- **Communication:** announce start/stop in `#ops-deploy` and pin status until post-deploy sign-off.

## Pre-deployment checklist
- [ ] Change ticket created with scope, owner, and rollback plan.
- [ ] `main` branch green in CI; `npm run ci` passed on commit to deploy.
- [ ] Registry credentials and kubeconfig for prod are present in the runner (`$KUBECONFIG`, `$REGISTRY` envs).
- [ ] Secrets synced from vault to cluster namespace (verify `kubectl get secrets --namespace summit-prod`).
- [ ] Persisted GraphQL map built and committed (`npm run persisted:check`).
- [ ] Backup job status verified for the last 24h (PostgreSQL, Redis, Neo4j snapshots).

## Dry run (staging parity)
1. `npm run lint && npm run typecheck && npm run test:smoke` to ensure promotion artifact is clean.
2. `npm run deploy:staging` and wait for green health checks:
   ```bash
   ./scripts/health-check.sh --env staging --timeout 300
   ```
3. Execute the critical path smoke: `node smoke-test.js --ci --env staging`.
4. If any step fails, halt and file a blocking issue.

## Production deployment steps
1. Freeze merges to `main` until completion.
2. Tag the release candidate: `git tag -a prod-$(date +%Y%m%d%H%M) -m "Prod deploy" && git push origin --tags`.
3. Deploy: `npm run deploy:prod` (wrap in a shell with `set -euo pipefail`).
4. Watch rollout per workload:
   ```bash
   kubectl rollout status deploy/api --namespace summit-prod --timeout=180s
   kubectl rollout status deploy/web --namespace summit-prod --timeout=180s
   kubectl get pods --namespace summit-prod -o wide
   ```
5. Run production smoke:
   ```bash
   NODE_ENV=production node smoke-test.js --ci --env prod --persisted-only
   ./scripts/health-check.sh --env prod --timeout 300
   ```
6. Validate persisted queries are enforced (security hardening gap): `npm run persisted:check` against live endpoints via bastion.
7. Confirm rate limiting and WAF rules:
   - Send 500 req/min from test runner using `artillery run scripts/perf/rate-limit.yml`.
   - Ensure 429s are emitted and alert threshold not triggered.

## Post-deployment validation
- **GraphQL:** run `scripts/graphql/verify_schema.sh --env prod` and diff with staging.
- **Data plane:** execute `scripts/db/apply_api_migrations.sh --dry-run` to confirm no pending migrations.
- **AI/ML:** trigger sample inference (`npm run extract -- --document samples/demo.pdf`) and record latency with `scripts/perf/snapshot.sh`.
- **WebSockets:** execute `node test-collab.js --env prod` for reconnection/resume coverage.
- **Monitoring:** verify Grafana dashboards show new build version; check Prometheus for scrape freshness <60s.

## Rollback procedure
1. Stop traffic via ingress weight flip to previous stable release (`kubectl rollout undo deploy/api -n summit-prod`).
2. Revert web build with `kubectl rollout undo deploy/web -n summit-prod`.
3. Validate rollback smoke (`node smoke-test.js --ci --env prod --persisted-only`).
4. Re-enable traffic and post-mortem start within 24h.

## Evidence to capture
- Deployment command transcripts (attach to ticket).
- Smoke test output and health-check logs.
- Screenshots of key dashboards (latency, error rate, saturation, queue depth).
- `kubectl get events` snapshot during rollout and rollback (if triggered).
- Rate-limit and persisted-query enforcement logs showing blocked attempts.

## Exit criteria
- All post-deploy validation checks pass with no Sev1/Sev2 alerts in 30 minutes.
- Error rate <0.5% and p95 latency within agreed SLOs.
- Backup jobs still healthy post-deploy and next run scheduled.
- Release manager announces completion and unfreezes `main`.
