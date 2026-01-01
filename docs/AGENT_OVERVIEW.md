# Agent Overview

## Status & Precedence

This overview is descriptive and does not override operational instructions. If conflicts arise,
follow `docs/governance/CONSTITUTION.md` → `docs/governance/AGENT_MANDATES.md` → `AGENTS.md` → local
`AGENTS.md` files.

Directory for Summit Agents.

## Available Agents

- **Jules**: Primary coding agent.
- **Codex**: Repository management and code quality.
- **Reviewer**: Code review and PR gates.
- **Predictive**: Analytics and risk forecasting.
- **Psyops**: Prompt engineering and behavioral analysis.
- **Executor**: Task runner for flows.

## Structure

Each agent is located in `agents/<name>/` and contains:

- `PROMPT.md`: Core system prompt.
- `tools/`: Agent-specific tools.
- `config.yaml`: Agent configuration.
