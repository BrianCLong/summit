# Prompt 9: Canonical Output Templates (CEO Dispatch, Board One-Pager, etc.)

**Tier:** 3 - Automation & Tooling
**Priority:** Medium
**Effort:** 4 days
**Dependencies:** Prompts 1, 3, 11
**Blocks:** None
**Parallelizable:** Yes (with Prompts 6, 8)

---

You are Claude Code, an AI software engineer for Topicality.

Context:
- We have canonical outputs:
  - CEO Dispatch,
  - Board One-Pager,
  - Execution Order,
  - Customer Value Memo,
  - Risk & Ethics Memo.
- We want a templating system plus generation scripts that can assemble these from structured inputs.

Goal:
Implement a small template engine + schema definitions + generators for at least:
1) CEO Dispatch,
2) Board One-Pager,
3) Execution Order.

Assumptions:
- Use a common language (TypeScript/Node or Python).
- Use simple templating (e.g., Jinja2, Handlebars, or string interpolation).

Requirements:
1. Schemas
   - Define JSON schemas (or Pydantic/TypeScript types) for:
     - CEO Dispatch input (metrics, priorities, risks).
     - Board One-Pager input (strategy, traction, runway, asks).
     - Execution Order input (who/what/when/definition-of-done).

2. Templates
   - Markdown templates with:
     - decision-first summary,
     - numbered, skimmable sections,
     - placeholders for metrics and run_ids.

3. Generators
   - Functions/CLI commands that:
     - take input JSON,
     - validate against schema,
     - render Markdown output.
   - Option to also emit a claim ledger manifest reference for the document.

4. Examples
   - Provide example input JSONs for each doc type.
   - Generate sample outputs in an `examples/` folder.

5. Tests & docs
   - Tests for:
     - schema validation,
     - template rendering.
   - README explaining how to:
     - add new templates,
     - integrate into Maestro or other tooling.

Deliverables:
- Schemas.
- Templates.
- Generator scripts/CLI.
- Sample inputs/outputs, tests, and README.
