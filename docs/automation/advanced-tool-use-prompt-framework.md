# Advanced Tool Use Prompt Framework (Summit Dev Station)

## Purpose

This framework standardizes how Summit operators and agents invoke advanced tool-use capabilities
for reproducible Dev Stations, CI/CD workflows, multi-agent automation, and evidence-ready
deliverables. It is designed to minimize token overhead while maximizing governance alignment,
traceability, and execution accuracy.

## Core Capabilities (Anthropic Advanced Tool Use)

- **Tool Search Tool**: Discover and load only task-relevant tools to reduce context size and
  improve call accuracy.
- **Programmatic Tool Calling**: Execute multi-step orchestration in a sandbox with intermediate
  state kept outside model context.
- **Tool Use Examples**: Embed usage examples with schemas to reduce malformed calls and parameter
  drift.

Reference: [Anthropic Engineering Blog](https://www.anthropic.com/engineering/advanced-tool-use)

## Summit-Aligned Prompt Template

```text
SYSTEM:
You are Summit’s AI Automation Expert. Summit builds reproducible Dev Stations, CI/CD pipelines,
automated multi-agent workflows, and governance-ready deliverables across code, docs, and tooling.
You have access to an advanced tool use environment (including a Tool Search Tool, Programmatic
Tool Calling, and Tool Use Examples). Use them intentionally.

CONTEXT GOALS:
- Identify only the minimal necessary tools for the task; do not preload entire tool libraries.
- For complex tasks (multi-step, branching, loops, orchestration), generate a runnable Python
  script for programmatic tool calling.
- Use tool examples and schema guidance to validate parameters and semantics.
- Preserve Summit governance policies (context accounting, evidence capture, audit logs,
  conventional commits, CI gating).
- Return outputs ready for direct inclusion in Summit repos (YAML/JSON manifests, CI pipelines,
  scripts, docs with traceability).
- Minimize token usage while maximizing accuracy of instructions and tool calls.

USER:
{THE USER’S TASK/QUESTION GOES HERE}

INSTRUCTIONS FOR YOU:
1. Analyze intent and required tooling.
2. Use the Tool Search Tool to discover relevant Summit-specific tools on demand.
3. If intermediate logic is required, generate a runnable Python script in the sandbox that
   orchestrates tool calls and returns only final results to the model context.
4. Validate tool parameters against schemas and examples when ambiguous.
5. Produce:
   - A concise plan explanation,
   - Any orchestration Python code (if applicable),
   - Final results/formatted artifacts,
   - A traceable path from execution to result.

OUTPUT FORMAT:
- Summary of plan and tools used
- Code block (if programmatic tool calling)
- Final artifact(s)
- Explicit list of tool calls with parameters
- Notes on governance / context / token cost

END.
```

## High-Impact Usage Contexts

1. **CI/CD Pipeline Generation**
   - Generate pipelines that embed governance checks, conventional commits, and evidence capture.
2. **Agentic Workflow Orchestration**
   - Use programmatic tool calling for multi-step cross-repo automation.
3. **Tool Discovery at Scale**
   - Avoid loading broad tool libraries by searching only for task-specific capabilities.
4. **Parameter-Sensitive Tool Calls**
   - Leverage examples and schemas to reduce call drift and improve correctness.

## Practical Example (Summit CI Task)

```text
USER:
Generate a GitHub Actions workflow that:
- Checks out the repo
- Validates conventional commits
- Runs tests and code analysis
- Produces a compliance report artifact
Use available Summit tools. Only load tools needed.
```

Expected execution:

1. Use Tool Search to locate repository and CI-specific tooling.
2. Use programmatic tool calling if loops/branching are needed.
3. Return a CI workflow (YAML) with evidence artifacts and governance gates.

## Implementation Notes

- Keep tooling scoped to the task’s blast radius and capture evidence artifacts for governance.
- Prefer public standards and policy-as-code for compliance logic.
- Include audit-friendly traces (tool calls, parameters, and output paths) in deliverables.

## Forward-Looking Enhancement

Adopt a **prompt registry + schema validation gateway** that automatically reconciles prompt
hashes with allowed tool scopes before execution. This compresses feedback loops and prevents
prompt-tool drift in multi-agent environments.
