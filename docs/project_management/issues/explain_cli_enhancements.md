# Codex Task: Explain CLI Enhancements

**Priority:** P1  
**Labels:** `codex`, `ux`, `explainability`, `ga`

## Desired Outcome

`explain` CLI output provides analyst-readable decision tree, confidence, cost, and policy-trigger context.

## Workstreams

- Add decision tree rendering to CLI output.
- Add confidence summary section.
- Add cost summary section.
- Show matched policy triggers and decisions.
- Apply redaction for sensitive data.

## Key Deliverables

- Updated CLI formatter and renderer tests.
- Redaction coverage for sensitive trace fields.
- Analyst-facing usage examples in docs.

## Acceptance Criteria

- CLI output is readable and complete for analysts.
- Sensitive fields are redacted per governance policy.
- Decision trace includes confidence, cost, and policy context.
