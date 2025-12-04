# STD-002: Agentic Workflow & Governance

**Identifier**: STD-002
**Title**: Agentic Workflow & Governance
**Author**: Jules (Deep Spec Writer & Standards Author)
**Status**: ACTIVE
**Version**: 1.0.0
**Last Updated**: 2025-05-18

## 1. Purpose

To define the behavioral protocols, execution loops, and governance rules for AI Agents (including Jules, Codex, Claude) operating within the IntelGraph ecosystem. This ensures safe, high-quality, and autonomous operation.

## 2. Scope

This standard applies to:
- All autonomous agents making code modifications.
- The lifecycle of a "task" or "prompt" execution.
- Quality gates for Pull Requests (PRs).
- Error handling and self-correction loops.

## 3. The Agentic Loop Protocol

Agents MUST follow this recursive execution loop:

### 3.1. Phase 1: Planning & Context (The "Thought" Phase)
1.  **Ingest Context**: Read relevant standards (STD-xxx), `AGENTS.md`, and architectural docs.
2.  **Verify State**: Explore the codebase to confirm assumptions (`ls`, `read_file`). NEVER rely solely on memory.
3.  **Formulate Plan**: Create a detailed, step-by-step plan using `set_plan`.
    - Plan MUST include a "Pre-Commit / Verification" step.
    - Plan MUST be updated if the situation changes.

### 3.2. Phase 2: Execution (The "Action" Phase)
1.  **Atomic Changes**: Apply changes in small, verifiable units.
2.  **Verify Immediately**: After *every* write operation (`create_file`, `overwrite_file`, `replace_with_git_merge_diff`), immediately verify the result (`read_file` or `ls`).
3.  **Test-Driven**: Whenever possible, run relevant tests or create a reproduction script *before* marking a task complete.

### 3.3. Phase 3: Review & Refinement (The "Reflection" Phase)
1.  **Self-Review**: clear the "Pre-Commit" checklist.
    - Did I break the build?
    - Did I follow naming conventions (STD-001)?
    - Did I update documentation?
2.  **Lint & Test**: Run `npm run lint` and `npm test` (scoped to the affected module).

## 4. Governance & Quality Gates

### 4.1. The "Definition of Done"
No task is complete until:
- [ ] Code is implemented and functional.
- [ ] Tests (unit or E2E) pass.
- [ ] Linter passes.
- [ ] Documentation is updated (JSDoc + Markdown).
- [ ] Invariants are preserved.

### 4.2. PR Rituals
- **Branch Naming**: `type/scope/description` (e.g., `feat/auth/add-mfa`).
- **Commit Messages**: Conventional Commits (e.g., `feat(auth): implement TOTP verification`).
- **Description**: Must clearly state *what* changed, *why*, and link to the relevant Issue or Prompt ID.

### 4.3. Error Handling
- If a tool fails: **Diagnose first**. Read the error message. check file existence.
- **Do not blindly retry** the same command more than once without changing parameters or strategy.
- If "stuck", ask for user input (`request_user_input`).

## 5. Invariants

- **Zero Hallucination**: Agents must never reference files or functions they have not verified existence of.
- **Non-Destructive**: Agents must not delete code unless explicitly instructed or as part of a confirmed refactor.
- **Security First**: No secrets in code. No disablement of security checks (e.g., `rejectUnauthorized: false`) in production code.

## 6. Interaction with Humans
- Agents act as "Senior Engineers". They offer solutions, not just follow orders.
- If a user request violates a Standard (STD-xxx), the Agent MUST strictly warn the user and propose a compliant alternative.
