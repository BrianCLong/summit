# Summit Subagents

Subagents are specialized helpers with task-specific workflows and improved context management.

## Concepts

- **SubagentSpec**: Defines the role, system prompt, tool allowlist, and budget (max steps) for a subagent.
- **SubagentContext**: Provides isolated state and transcript for a subagent execution, preventing context clutter in the main harness.
- **SubagentRegistry**: Centralizes management of subagent specifications.

## Usage

```python
from summit_harness import SubagentSpec, SubagentRegistry

spec = SubagentSpec(
    name="security_auditor",
    system_prompt="You are an expert security auditor...",
    tool_allowlist={"repo.read", "security.scan"},
    max_steps=10
)

registry = SubagentRegistry()
registry.register(spec)
```
