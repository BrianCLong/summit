# Prompt: Narrative Engineering & Counter-Campaign Epics (v1)

## Objective

Create concrete Summit epics for narrative engineering and counter-campaign design. Each epic must
include proposed Neo4j schema changes, GraphQL operations, and copilot chains. Ensure all content
aligns to Summit governance and readiness assertions.

## Scope

- docs/narrative/
- docs/roadmap/STATUS.json
- prompts/docs/narrative-engineering-epics@v1.md
- prompts/registry.yaml

## Required Output

- A narrative engineering epic document that covers three capabilities:
  1. Narrative structure graph layer
  2. Doctrine-aware playbooks
  3. Counter-campaign templates and simulation workbench
- Neo4j schema proposals with labels, relationships, and constraints
- GraphQL operations (queries and mutations)
- Copilot chains with guardrails, inputs, and outputs
- Roadmap status update in docs/roadmap/STATUS.json

## Constraints

- Cite Summit readiness and governance authority files.
- Express compliance logic as policy-as-code and log decisions.
- Provide explicit success metrics and verification plan entries.
