# Approval Protocol

High-risk tools (delete_file, send_payment) require an `approval_id` in the `tool_calls` metadata or security context.

1. Agent requests high-risk tool.
2. Policy engine blocks it if `approval_id` is missing.
3. User is prompted.
4. User confirms -> `approval_id` is generated (e.g., signed token).
5. Agent retries with `approval_id`.
