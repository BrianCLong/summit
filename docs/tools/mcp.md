# MCP Bridge

## Drift Detection
The bridge monitors `notifications/tools/list_changed`.
When detected, it compares the hash of the new tool list against the known hash.
Drift triggers a policy event (Warning or Error depending on configuration).
