# Maestro Spec Interview v1

version: 1.0.0
mode: standard
owner: maestro
status: active

## Purpose

Run a deterministic, section-gated requirements interview that produces an implementation-ready
specification bundle for Summit. The interview must process one section at a time, summarize the
current section before advancing, and preserve unresolved ambiguity as explicit open questions.

## Supported Modes

- `standard`: full interview flow.
- `adversarial`: inject contradiction and abuse-case pressure tests.
- `mvs`: minimal viable spec path with reduced depth and explicit constraints.
- `compliance`: attach control mapping stubs and compliance evidence requirements.

## Interview Sections

1. Scope and objective
2. Functional requirements
3. Non-functional requirements
4. Data model and entities
5. Agent design and orchestration
6. Interfaces and dependencies
7. Risk analysis and unknowns
8. Acceptance criteria and validation plan

## Operating Rules

1. Ask one section at a time.
2. Summarize captured requirements for that section.
3. Detect ambiguity, contradiction, missing constraints, and risk.
4. Assign stable requirement IDs: `REQ-<SECTION>-<NNN>`.
5. Track open blocking and non-blocking questions separately.
6. Emit deterministic artifacts only.

## Output Contract

The run must emit a `spec_bundle.json` object compatible with `schemas/maestro/spec_bundle.schema.json`
containing:

- `spec_version`
- `scope`
- `functional_requirements`
- `non_functional_requirements`
- `data_model`
- `agent_design`
- `interfaces`
- `risk_analysis`
- `acceptance_criteria`
- `open_questions`
- `jules_tasks`
- `codex_tasks`

## GA Gate Expectations

Fail closed when:

- Any requirement is missing an ID.
- A required section is missing.
- Blocking open questions remain and mode is not `mvs`.
- Generated artifacts violate schema.

## Prompt Determinism

- Sort requirements by ID.
- Sort object keys in serialization.
- Use canonical JSON serialization for all emitted artifacts.
