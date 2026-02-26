# Repo Assumptions & Reality Check

## Section A: Verified Paths
- `docs/`: Documentation root.
- `scripts/`: Utility scripts.
- `pipelines/`: CI/CD pipelines.
- `server/`: Backend services.
- `.github/workflows/`: GitHub Actions workflows.
- `AGENTS.md`: Governance documentation.
- `docs/roadmap/STATUS.json`: Roadmap status file.
- `governance/tool_registry.yaml`: Allowed tools registry.

## Section B: Agents Directory
- `agents/`: Directory for agent implementations.
  - *Status*: Created successfully.
  - *Content*: `agents/ui_automation` module.

## Section C: Must-Not-Touch List
- `AGENTS.md`: Read-only guidance.
- `LICENSE`: Legal.
- Root `package.json`: Do not modify scripts unless necessary.
- `pnpm-lock.yaml`: Managed via pnpm.
- `.github/workflows/ci.yml`: Core CI workflow.
- `governance/tool_registry.yaml`: Only add approved tools.

## Section D: Governance & Constraints
- **Testing**: `pnpm test:unit`, `pnpm test:integration`, `pnpm e2e`.
- **Security**: No secrets in code.
- **AI Agents**: Update `STATUS.json`.
