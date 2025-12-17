# STD-003: Documentation & Knowledge Management

**Identifier**: STD-003
**Title**: Documentation & Knowledge Management
**Author**: Jules (Deep Spec Writer & Standards Author)
**Status**: ACTIVE
**Version**: 1.0.0
**Last Updated**: 2025-05-18

## 1. Purpose

To define the requirements for code documentation, architectural records, and the maintenance of the knowledge base. Documentation is treated as code: versioned, reviewed, and tested.

## 2. Scope

- Inline code documentation (JSDoc, TSDoc).
- Module-level READMEs.
- Architectural Decision Records (ADRs).
- The Standards Library (`docs/standards/`).
- User guides and runbooks.

## 3. Inline Documentation Standards

### 3.1. Public Interfaces
All exported classes, interfaces, functions, and constants MUST have TSDoc/JSDoc comments.
- **Functions**: Describe purpose, parameters (`@param`), return value (`@returns`), and exceptions (`@throws`).
- **Classes**: Describe the responsibility of the class and its lifecycle.

**Example**:
```typescript
/**
 * Manages the lifecycle of Batch Jobs using pg-boss.
 * Implements the Singleton pattern.
 */
export class BatchJobService { ... }
```

### 3.2. Complex Logic
Any non-trivial algorithm or workaround MUST be accompanied by a comment explaining the "Why", not just the "How".

## 4. Markdown Documentation Standards

### 4.1. Module READMEs
Every major directory in `server/src/` or `packages/` SHOULD have a `README.md` containing:
- **Overview**: What this module does.
- **Key Components**: Main classes/functions.
- **Usage**: Example code snippets.
- **Dependencies**: What it relies on.

### 4.2. Architecture Decision Records (ADRs)
Significant architectural choices MUST be recorded in `docs/ADR/` (or `docs/adr/`, to be standardized to `docs/ADR/` per STD-001 if chosen, but currently mixed. *Standard: `docs/ADR/`*).
- Format: Numbered (e.g., `ADR-013-Decouple-Orchestrator.md`).
- Sections: Context, Decision, Consequences.

## 5. The Standards Repository
- Located at `docs/standards/`.
- The single source of truth for engineering norms.
- All documents must follow STD-000 structure.
- **Index**: `docs/standards/README.md` must be kept up to date.

## 6. Maintenance & Liveness
- **Stale Docs**: Documentation that conflicts with the code is a bug. It must be fixed in the same PR that changes the code.
- **Generated Docs**: Where possible, use tools to generate API references (e.g., from OpenAPI specs or TSDoc) into `docs/generated/`.

## 7. Tone and Style
- **Professional**: Use clear, concise, technical language.
- **Authoritative**: Avoid weasel words ("maybe", "might"). Use "MUST", "SHOULD", "WILL".
- **Inclusive**: Avoid gendered pronouns; use "they" or the role name ("the user").
