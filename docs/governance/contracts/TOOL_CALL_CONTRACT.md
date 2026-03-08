# Tool Call Contract

## Purpose
Defines the required fields and constraints for any tool call made by the system. This ensures a consistent boundary for agentic operations and prevents unauthorized access.

## Versioning
- Version: 1.0.0
- Schema ID: `summit.tool.call.v1`

## Fields
- `schema_version`: Must be `1.0.0`
- `tool_name`: String identifier of the tool
- `run_id`: UUIDv4 or deterministic hash string
- `action`: String representation of the operation
- `parameters`: Object containing the tool's inputs
- `declared_scope`: String identifier for the required capability scope
- `data_class`: Security classification of the data (e.g., `PUBLIC`, `PII`, `INTERNAL`, `RESTRICTED`)
- `decision`: Execution decision (e.g., `ALLOW`, `DENY`, `LOG`)
- `reason`: Explanation for the decision

## Canonicalization Rules
1. Keys must be sorted alphabetically.
2. The `parameters` object must be recursively sorted by key.

## Determinism Rules
- Tool calls with the same parameters and policy state must yield the same decision and hash.

## Failure Modes
- `unregistered_tool`: The tool is not present in the Tool Policy.
- `missing_contract`: The tool invocation lacks the required contract wrapper.
- `unauthorized_scope`: The tool invocation requests a scope that the caller does not possess.
- `policy_violation`: The execution decision was `DENY`.
