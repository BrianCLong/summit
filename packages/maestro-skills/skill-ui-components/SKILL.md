# UI Components Skill

**Purpose:** Reliable component generation that ensures accessibility, type safety, and design system adherence.

## Inputs
- `component_name`: Name of the component (e.g., `Button`).
- `description`: Natural language description of functionality/style.
- `props`: List of desired props.

## Outputs
- `component_code`: React component code.
- `test_code`: Unit test code.
- `storybook_code`: Storybook story code.
- `validation_report`: Results of AST and static analysis checks.

## Moats
- **AST Validation**: Verifies hook rules, prop types, and no arbitrary hex values.
- **A11y-First**: Auto-injects aria-labels and roles.
