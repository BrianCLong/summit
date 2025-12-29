# Agent Runtime Evaluations Runbook

This runbook describes how to execute the unified `AgentRuntime` interface, run the golden-dataset eval harness, and interpret CI gates.

## Overview

- **Runtime interface:** `AgentRuntime` defines `start`, `step`, `toolcall`, and `stop`. The concrete implementation is `UnifiedAgentRuntime` in `agent_runtime/runtime.py`.
- **Prompt source:** Prompts are centralized under `.agentic-prompts/` with versioning in `manifest.json`.
- **Backends:** Adapters exist for `grok`, `claude`, `gemini`, and `qwen` in `agent_runtime/backends.py`.
- **Golden datasets:** Stored in `GOLDEN/datasets`. Each JSONL entry provides deterministic fixtures for expected outputs and optional tool lists.
- **Eval CLI:** `python -m agent_runtime.evals run --suite core --backend qwen --out artifacts/agent-evals` (also available via `make agent-evals`).

## Local usage

1. Ensure Python 3.10+ is available.
2. From repo root, execute:
   ```bash
   make agent-evals
   ```
   This runs the core suite against the Qwen backend and writes reports to `artifacts/agent-evals/`.
3. Inspect artifacts:
   - `artifacts/agent-evals/report.json`: machine-readable summary for CI.
   - `artifacts/agent-evals/report.md`: human-friendly markdown summary.

## CI enforcement

- CI should invoke `make agent-evals` before merge.
- Default thresholds: `exact_match >= 0.80` and `tool_success_rate >= 0.80`. The CLI exits non-zero if thresholds are not met, which blocks merges.
- Store `artifacts/agent-evals/report.json` as a build artifact to enable trend tracking.

## Troubleshooting

- **Prompt not found:** Confirm `.agentic-prompts/manifest.json` exists and lists the family/version for the prompt being requested.
- **Missing datasets:** Ensure `GOLDEN/datasets` is present locally; sync from main if missing.
- **Unexpected backend error:** Backends are deterministic stubs by default. If integrating real API clients, wrap them in the backend classes to preserve the `generate` signature and latency capture.

## Extending

- Add new prompt versions by creating `.agentic-prompts/<family>/<name>_<version>.prompt` and updating `manifest.json`.
- Define new suites by editing `DEFAULT_SUITE` in `agent_runtime/evals.py`.
- To integrate a new LLM backend, add a subclass to `agent_runtime/backends.py` and register it in `BACKEND_REGISTRY`.
