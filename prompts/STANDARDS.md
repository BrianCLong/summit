# Jules Unified Prompt Architecture Standards

## 1. Directory Structure

The prompt ecosystem is organized as follows:

- `prompts/`: Root directory for all prompt definitions.
- `prompts/library/atoms/`: Lowest-level reusable building blocks (e.g., roles, formats).
- `prompts/library/components/`: Mid-level logic blocks (e.g., operational loops, safety checks).
- `prompts/templates/`: High-level skeletons for creating new prompts.

## 2. Partial Syntax

To include a reusable module (atom or component) in a prompt, use the partial syntax:

```
{{> atoms/atom_name }}
{{> components/component_name }}
```

The path is relative to `prompts/library/` and should omit the file extension.

## 3. Naming Conventions

- **Files**: snake_case or kebab-case. e.g., `role.jules.md`.
- **IDs**: `domain.action@version`. e.g., `code.critic@v1`.
- **Partials**: Group by type. e.g., `atoms/role.jules`, `components/workflow.refine`.

## 4. Prompt Structure

All prompts must adhere to the `PromptConfig` schema:

1.  **Meta**: Metadata including ID, owner, purpose, and guardrails.
2.  **ModelConfig**: Model selection and parameters.
3.  **Inputs**: Typed input variables.
4.  **Template**: The actual prompt text, composed of atoms and components.
5.  **OutputSchema**: Definition of the expected output format.
6.  **Examples**: Golden test cases.

## 5. Style Guidelines

- **Clarity**: Use clear, imperative language.
- **Modularity**: Don't repeat logic. Extract it to a component.
- **Verification**: Always include a "Verification" or "Reflection" step in complex prompts.
- **Safety**: Guardrails must be explicit in the `meta` section and enforced in the `template`.
