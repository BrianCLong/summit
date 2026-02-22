# Onboarding Checklist

This checklist matches the command flow and endpoints published in the main README.

## Prerequisites (must-have)

- [ ] Docker Desktop installed (README calls out Docker Desktop ≥ 4.x).
- [ ] Node.js installed at **20.11.0** (README says it matches `.tool-versions`).
- [ ] `pnpm` installed (README calls out pnpm 9).
- [ ] Python 3.11+ installed (README calls out Python 3.11+).

## Golden Path: “running stack in minutes”

- [ ] Clone and enter repo:
  - `git clone https://github.com/BrianCLong/summit.git`
  - `cd summit`

- [ ] Bootstrap dev environment:
  - `make bootstrap`

- [ ] Start the Docker stack:
  - `make up`

- [ ] Validate baseline health:
  - `make smoke`

## Confirm you can reach required endpoints

Open these in a browser (from README):

- [ ] Frontend: `http://localhost:3000`
- [ ] GraphQL API: `http://localhost:4000/graphql`
- [ ] Neo4j Browser: `http://localhost:7474` (README lists `neo4j` / `devpassword`)
- [ ] Adminer: `http://localhost:8080`
- [ ] Grafana: `http://localhost:3001`

## GA Gate: contribution-grade validation (pre-PR)

- [ ] Run the enforced pre-flight:
  - `make ga`

- [ ] Confirm the gate covers the full readiness sequence (README states):
  - Lint & unit
  - Clean environment reset
  - Deep health checks
  - E2E smoke tests
  - Security scanning

## First contribution workflow (recommended)

- [ ] Pick a bounded area (examples by directory):
  - UI: `client/` or `conductor-ui/`
  - Backend/API: `backend/`, `api/`, `api-schemas/`
  - Orchestration: `.maestro/`, `.orchestrator/`
  - Ops/Governance: `runbooks/`, `SECURITY/`, `compliance/`, `audit/`, `.ga-check/`

- [ ] Create a branch using a consistent naming convention.
- [ ] Implement change + tests.
- [ ] Re-run `make ga` before opening PR (treat as non-negotiable).

## “If it fails” triage checklist

- [ ] Re-run `make ga` after a clean reset (the gate includes a reset stage; reproduce locally).
- [ ] If service endpoints fail, validate Docker services are up (compose/ and charts/ exist as repo-level infrastructure hints).
- [ ] If tests are brittle, consult `TESTING.md` (explicitly linked from README as the test runtime source of truth).
