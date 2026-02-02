# Senior Engineer Playbook: AI Coding Tools

## The Technique Gap
Research shows that senior engineers often struggle with AI tools more than juniors because they lack specific *techniques*, not aptitude. This playbook bridges that gap.

## Core Techniques

### 1. Context Management
Don't dump the whole repo. Provide **minimal sufficient context**:
- Architecture overview
- Relevant invariants
- Edge cases to handle
- Specifically related files only

### 2. Prompt Specificity (Prompt Packets)
Use the standard template in `policy/ai-coding/prompt-packet.md`. Always include **Non-goals** to prevent scope creep.

### 3. Structured Outputs
Prefer JSON contracts for plans and changesets. This makes it easier for CI gates to validate the AI's work.

### 4. Controlled Reasoning
Use "Let's think step by step" as a tactic, but keep the output clean.

## Workflow Integration
Leverage the **Model Context Protocol (MCP)** to connect agents to real services safely. See `mcp/README.md` for more details and the [MCP Policy](../../policy/ai-coding/mcp-policy.md).

## Decision Rubric
Always refer to the [Agent vs. Manual Decisioning Rubric](../../policy/ai-coding/agent-vs-manual.md) before starting a significant AI-assisted task.
