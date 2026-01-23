# RFC: Safe Integration of MCP Agents in CI

## Status
**Proposed**

## Context
We want to run intelligent agents (Governance, Evidence) as part of our CI pipeline to automate checks. However, agents are nondeterministic by nature and "prompt injection" is a valid attack vector against the build system.

## Problem Statement
How do we integrate LLM-driven agents into GitHub Actions without:
1.  Leaking high-value secrets.
2.  Creating flaky builds due to nondeterminism.
3.  Allowing an agent to "hallucinate" a passing grade.

## Proposed Solution

### 1. The "Replay" Strategy
To solve flakiness and cost, agents in CI should primarily run in **Replay Mode** using recorded context, unless it is a specific "Live" workflow (e.g., nightly integration).

- **Dev Mode:** Developer runs agent locally -> Generates `interaction_log.json`.
- **CI Mode:** CI runner uses `interaction_log.json` to verify the agent's logic *without* calling the LLM again, OR calls the LLM with `temperature=0` and strict schema constraints.

### 2. Sandbox Isolation
Agents must execute in a restricted environment:
- **Network:** Egress blocked except to localhost (MCP servers) and specific API endpoints.
- **Filesystem:** Read-only access to the repo; Write access only to `artifacts/`.

### 3. Determinism Check
A critical CI step is the **Determinism Verification**:
1.  Run Agent (Run 1) -> Output Hash A
2.  Run Agent (Run 2) -> Output Hash B
3.  Assert `Hash A == Hash B`.

If an agent cannot reproduce its own work, it is rejected.

## Proposed Workflow

```yaml
name: Agent Governance Checks
on: [pull_request]

jobs:
  governance-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup MCP Runtime
        run: pnpm install @summit/mcp-runtime

      - name: Run Governance Agent (Audit)
        run: |
          mcp-run agent:governance \
            --input context/pr_context.json \
            --output artifacts/audit_result.json
        env:
          MCP_MODE: strict

      - name: Verify Signature
        run: ./scripts/verify_agent_signature.sh artifacts/audit_result.json

      - name: Upload Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: governance-evidence
          path: artifacts/
```

## Security Implications

- **Token Scope:** Agents receive a short-lived `GITHUB_TOKEN` with minimal permissions.
- **Secrets:** Agents *never* receive raw secrets. They access services via MCP Servers which handle authentication internally.

## Artifacts
The final output is a `governance-bundle.zip` containing:
- The context envelope (inputs).
- The agent's reasoning trace (logs).
- The final verdict (structured JSON).
