# Prompt Engineering Standards (ByteByteGo 2026-02-04)

## Overview
This standard adopts the "Guide to Effective Prompt Engineering" by ByteByteGo into Summit's engineering practices.

## Core Principles
1.  **Clarity**: Instructions must be specific and unambiguous.
2.  **Context**: Provide relevant information to reduce hallucinations.
3.  **Examples**: Use few-shot learning for complex tasks.
4.  **Structure**: Separate System and User prompts.

## Prompt Artifact Schema
All prompts must be defined in `.prompt.yaml` files adhering to the schema `summit/prompts/schema/prompt_artifact.schema.json`.

### Components
- `task_description`: What needs to be done.
- `context_rules`: Constraints and background.
- `examples`: List of input/output pairs (max 5 by default).
- `concrete_task`: The actual input to process.

## Techniques & Trade-offs
- **Zero-shot**: Low cost/latency, higher risk of format error. Use for simple classification.
- **Few-shot**: Higher cost/latency, better reliability. Use for nuance.
- **Chain-of-Thought (CoT)**: Highest cost/latency. Use for reasoning. Default OFF.
- **Chaining**: Break complex tasks into multiple prompts.

## Validation
Run `summit prompt lint` to verify compliance.
