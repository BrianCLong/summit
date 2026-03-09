# Operational Runbook: CreateOS Subsumption (MCP + Packs)

## Service Overview

The Summit MCP Server provides programmatic access to Summit's validation and evidence generation workflows. Deploy Packs allow users to package applications from multiple sources (GitHub, Docker, etc.) for validation.

## Local Operations

### Start MCP Server
```bash
# Start the MCP server over stdio
pnpm run mcp:start
```

### Build a Deploy Pack
```bash
# Build a pack from a manifest
npx tsx src/packs/build_pack.ts --spec summit.deploy.json
```

## Monitoring & Alerting

- **Drift Detector**: Runs daily via GitHub Actions. If it fails, it means external documentation or endpoints have changed, and integration assumptions should be reviewed.
- **CI Failures**: MCP contract tests or Pack determinism tests failing in CI will block PRs.

## Troubleshooting

### MCP Tool Errors
- Check `logs/mcp.log` for internal errors.
- Ensure inputs match the Zod schemas in `src/mcp/schema/index.ts`.

### Determinism Failures
- Ensure no unstable timestamps are included in evidence reports.
- Use `2026-01-23T00:00:00Z` if a timestamp is mandatory.
