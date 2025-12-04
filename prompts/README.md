# Enterprise Prompt Registry

> **Authority:** Jules, Autonomous Editor-in-Chief
> **Status:** Production

## 1. Overview
This directory contains the cognitive blueprints for the Summit Agent Ecosystem. Each file represents a specialized persona or workflow designed to execute complex engineering tasks with high autonomy.

## 2. Prompt Standards
All prompts must adhere to the `v1` schema defined in [`schema.json`](schema.json).

### 2.1 Essential Components
1.  **Identity:** Who is the agent? (e.g., "You are the Architect.")
2.  **Mission:** What is the specific goal?
3.  **Constraints:** Hard limits (budget, tools, scope).
4.  **Output Format:** Explicit structure for the response.

## 3. Directory Structure
*   `packs/`: Grouped prompts for specific workflows (e.g., `audit-pack`).
*   `*.md`: Text-based system prompts for LLM context.
*   `*.yaml`: Structured executable prompts for the orchestration engine.

## 4. Usage
To invoke a prompt manually:
```bash
# Example: Load the Code Critic prompt
cat prompts/code.critic@v1.yaml | summitctl prompt exec
```

---
*Precision in instruction yields precision in execution.*
