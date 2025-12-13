# Agent Overview

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
