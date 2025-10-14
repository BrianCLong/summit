# Release Steps (Checklist)

- Prereqs: Docker, Node 18+, psql, k6 (optional), syft (optional)
- Install deps: `npm install && (cd server && npm install) && (cd client && npm install)`
- Apply DB migrations: `npm run db:api:migrate` (set `PG_URL`)
- Start stack (dev): `npm run dev` or compose scripts
- Run tests:
  - ABAC/API: `npm run test:api`
  - UI/e2e (optional): `npx playwright test`
- Perf checks:
  - Slow query logger: `SLOW_QUERY_MS=500`
  - Smoke: `k6 run load/k6_smoke.js`
  - Snapshot: `npm run perf:snapshot`
- Screenshots (docs): `npm run screenshots` (set `UI_URL` if not default)
- Versioning & RC:
  - Tag RC: `scripts/release/rc_tag.sh v1.0.0-rc.1`
  - Generate SBOM: `scripts/release/generate_sbom.sh sbom.json`
- Build images (example):
  - API/UI/Copilot Dockerfiles as configured in compose; push to registry
- Finalize release notes from CHANGELOG + perf snapshot + docs screenshots
