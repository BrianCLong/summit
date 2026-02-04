# Policy: Prompt Specificity Standard (Prompt Packets)

## Overview
To minimize hallucinations and unintended features, all AI-assisted tasks must follow the **Prompt Packet** standard. This ensures that senior engineers get repeatable, high-quality results from AI coding tools.

## Mandatory Sections
Every agent task must declare the following:

1. **Goal**: A clear, concise description of the intended outcome.
2. **Inputs**: Relevant files, context, and data.
3. **Outputs**: Expected files, formats, or changes (prefer JSON contracts).
4. **Constraints**: Limits on what the AI can change or use.
5. **Non-goals**: Explicitly state what the AI should **NOT** do (e.g., "Do not add new endpoints," "Do not refactor existing CSS").
6. **Acceptance Tests**: How the change will be verified.

## Reasoning Triggers
While Zero-shot-CoT ("Let's think step by step") is encouraged for complex reasoning, hidden reasoning traces must not be leaked into canonical logs or PR descriptions unless explicitly requested for debugging.

## Related
- [Agent vs. Manual Decisioning Rubric](./agent-vs-manual.md)
- [Senior Engineer Playbook](../../docs/ai-assist/senior-playbook.md)
