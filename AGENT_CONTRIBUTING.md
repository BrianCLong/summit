# Agent Contributing Guidelines

**Welcome, Agent.** This repository is optimized for autonomous contribution. Please adhere to the following protocols.

## 1. Operating Boundaries

- **No Schema Changes**: Do not modify `schema.prisma` or `schema.graphql` without explicit human approval (Label: `migration-gate`).
- **No Private Keys**: Never commit credentials. Use environment variables and the `config` module.
- **Respect Rate Limits**: When running tests, ensure `TEST_DELAY` is set to avoid hammering the mock APIs.

## 2. Using Skills

- **Frontend**: Consult [skills/summit-frontend-routing.md](skills/summit-frontend-routing.md) before touching React components.
- **Backend**: Use the `CompanyOS SDK` for all data access. Direct DB queries are forbidden in business logic.

## 3. Communication Protocol

- **PR Description**: Always include a "Why" section explaining the business value.
- **Labels**:
  - Apply `lane:bizdev` for GTM tasks.
  - Apply `type:chore` for maintenance.
- **Validation**: If you modify logic, you must add a test case in `tests/`.

## 4. Safety Rails

- **CI**: Ensure all checks pass. If `accessibility-check` fails, revert the UI change immediately.
- **Audit**: All actions taken by agents in production are logged to the Provenance Ledger.
