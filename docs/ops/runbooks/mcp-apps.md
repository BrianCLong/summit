# Runbook: MCP Apps

## Verifier Failure
- **Symptoms**: CI job `subsumption-bundle-verify` fails.
- **Triage**: Check `evidence/mcp-apps/report.json` for details.
- **Resolution**: Fix policy violation or update fixtures if policy changed intentionally.

## Policy Fixture Failure
- **Symptoms**: `fixtures_deny` count mismatch.
- **Action**: Ensure all deny fixtures are triggering correctly.
