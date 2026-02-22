# Repo Assumptions - UniReason 1.0 Integration

## Verified (from repo map)
*   **Language/Tooling:** TypeScript, Node 18+, pnpm.
*   **CI:** GitHub Actions.
*   **Key Paths:**
    *   `src/api/graphql`
    *   `src/api/rest`
    *   `src/agents`
    *   `src/connectors`
    *   `src/graphrag`
    *   `tests/`
    *   `docs/{architecture,api,security}`
    *   `.github/workflows/*`

## Assumed (to be validated)
*   **Pipeline Runner:** Existence of a central pipeline runner or agent orchestrator under `src/agents/*`.
*   **Evidence Schema:** Existing "evidence" artifact schema and CI enforcement steps.
*   **Logging:** Preferred logging framework and redaction utilities.

## Must-Not-Touch
*   `.github/workflows/ci-*.yml` (critical for governance)
*   `.github/policies/*`
*   `.github/MILESTONES/*`
*   Production docker-compose files (`docker-compose.yml`, `docker-compose.prod.yml`)

## Validation Checklist
1.  [ ] Confirm `pnpm` scripts: `pnpm test`, `pnpm test:e2e`, `pnpm test:coverage`.
2.  [ ] Locate agent orchestration entrypoints under `src/agents/`.
3.  [ ] Confirm preferred logger + redaction utilities.
4.  [ ] Identify CI check names that gate merges.
