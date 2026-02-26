# Google Agent-Docs Alignment Standard

## Purpose

Summit treats machine-readable, policy-aware contracts as the source of truth for agent operations.
This standard defines interoperability boundaries and explicitly excludes prose-only integration.

## Import and Export Matrix

| Source | Summit Import | Summit Export |
| --- | --- | --- |
| OpenAPI | Partial | Yes |
| JSON Schema | Yes | Yes |
| Prose docs | No | No |

## Requirements

- Every module-facing agent contract must be representable as JSON.
- Input and output contracts must be explicit and typed.
- Policy constraints and side effects must be declared in the contract.
- Evidence ID formatting must be encoded as a pattern, not implied in prose.

## Non-goals

- Natural-language-only specs.
- Runtime introspection shortcuts that bypass schema contracts.
- Hidden side effects not declared in agent documentation artifacts.
