# Agent Redteam Harness

The Agent Redteam harness exercises hostile scenarios against multi-agent workflows, including impersonation, prompt injection, and man-in-the-middle (MITM) attacks. Scenarios are mapped to registered prompts and agent task specs so every run can emit governance-aligned artifacts under `artifacts/agent-runs/`.

## Scenario Packs

Scenarios live under `sim-harness/agent-redteam/scenarios/` and include:

- **exfiltration**: impersonate a peer orchestrator, inject hostile prompts, and strip transport safeguards to exfiltrate model memory.
- **backdoor-pr**: bypass code-review guardrails to land a backdoor PR via automation.
- **dependency-tampering**: poison the supply chain by replacing trusted dependencies and forging provenance.

Each scenario declares:

- `prompt_ref`: Must map to a registered prompt hash (`prompts/registry.yaml`).
- `task_id` and `agent_id`: Linked to the agent task registry in `agents/redteam/registry.json`.
- `attack_vectors`: Impersonation, prompt injection, and MITM instructions with detection expectations.
- `controls`: Expected detections and mitigations to assert during runs.

## Running

1. Build the harness: `pnpm -C sim-harness build`
2. Execute a scenario run (writes `artifacts/agent-runs/{task_id}-{run}.json`):

```bash
node sim-harness/dist/agent-redteam/runner.js --scenario exfiltration
```

Use `--output` to override the artifact root (defaults to repo `artifacts/agent-runs`).

## Integration Points

- **Prompt registry**: Validates `prompt_ref.sha256` against `prompts/registry.yaml`.
- **Agent task registry**: `agents/redteam/registry.json` links scenario IDs to task specs and artifact targets.
- **Artifacts**: Each run captures transcript events, decision records, and provenance metadata for replay and audit.
