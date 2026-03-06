# Prompt Engineering Data Handling

## Classification
Prompts are considered **Code** (if fixed) or **Customer Data** (if containing user input).

## Requirements
1.  **Redaction**: Never log raw user inputs in prompt traces unless explicitly authorized for debugging in non-prod.
2.  **Injection Prevention**: Use delimiters (e.g., `"""`) to separate user input from system instructions.
3.  **Untrusted Inputs**: Must be declared in the `untrusted_inputs` field of the prompt artifact.

## Storage
- Prompt artifacts: Version control.
- Eval metrics: Aggregated stats only.
- Traces: TTL 7 days, PII redacted.
