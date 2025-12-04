# Traceability Guide

This document defines the conventions for maintaining traceability across the Summit/IntelGraph codebase.
The goal is to ensure every line of code can be traced back to a specific requirement, and every requirement is verified by tests.

## Core Concepts

*   **Requirement ID (ReqID)**: A unique identifier for a functional or non-functional requirement.
    *   Format: `REQ-{DOMAIN}-{ID}` (e.g., `REQ-AUTH-001`, `REQ-GRAPH-102`)
*   **Feature ID**: A higher-level identifier for a feature or epic.
    *   Format: `FEAT-{NAME}` (e.g., `FEAT-SSO`, `FEAT-COPILOT`)
*   **Test ID**: Maps a test case to a requirement.
    *   Format: `TEST-{REQ_ID}-{NUM}` (e.g., `TEST-REQ-AUTH-001-01`)

## Linking Conventions

### 1. Spec -> Code
In your code (comments or docstrings), reference the requirement or feature being implemented.

```typescript
/**
 * Validates the user session token.
 * @trace REQ-AUTH-001
 */
function validateSession(token: string): boolean {
  // ...
}
```

### 2. Code -> Tests
In your test files, reference the requirement being tested using the `@trace` tag or describe block.

```typescript
describe('Session Validation [REQ-AUTH-001]', () => {
  it('should reject expired tokens', () => {
    // ...
  });
});
```

### 3. Docs -> Spec
Documentation (PRDs, specs) should explicitly list the Requirement IDs they define.

## Traceability Matrix (Automated)

We use scripts to generate a traceability matrix by scanning for tags.
Ensure you use the `@trace` tag in JSDoc/comments to be picked up by the scanner.

## Feature Tags in PRs

When submitting a PR, include the Feature or Requirement ID in the PR description:

```markdown
## Related Features
* FEAT-COPILOT
* REQ-AI-005
```
