# Eval-driven Agentic RAG (2026 Standard)

This document defines the eval-driven development loop for RAG, treating prompts and tools as code.

## Goals
- Treat evals and graders as CI for model behavior.
- Support adversarial testing harnesses and continuous evaluation.
- Promote agentic retrieval with a verifier loop enforcing groundedness and citations.
- Enforce strict token and cost budgets.

## Architecture & Interfaces
- Inputs: User prompts, documents/chunks, tool-call logs.
- Outputs: `report.json`, `metrics.json`, `stamp.json`, `verifier.json`.
- The evaluation suite runs deterministic harness checks.
- A "verifier loop" rejects or retries retrieval if citations are unsupported.
