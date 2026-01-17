# Prompt: Maestro Query Explicitation Stage

Implement a first-class query explicitation stage for multimodal user requests.

## Objectives
- Rewrite underspecified multimodal queries into explicit, self-contained queries that preserve intent and scope.
- Produce a structured explicitation artifact with fields: explicit_query, intent, domain_guess, entities, visual_evidence, assumptions, unknown_slots, retrieval_plan, answer_style, confidence, clarifying_question.
- Gate retrieval so it cannot execute without explicitation unless a governance waiver is provided.

## Scope
- Add a Maestro explicitation module in packages/maestro-core with deterministic heuristics.
- Add a tool endpoint named explicate_query for MCP/agent tool routing.
- Integrate the Explicitate → Retrieve → Solve contract via a retrieval gate helper.
- Add unit tests and golden fixtures covering UI screenshots, photos, diagrams, and maps.
- Add concise documentation describing the contract and demo command usage.

## Constraints
- Do not invent sensitive personal data. Uncertainty must be captured in unknown_slots and a single clarifying question.
- Keep changes atomic to explicitation, tests, and docs.
- Surface confidence and uncertainty explicitly.
