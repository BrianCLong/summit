# Policy: Agent vs. Manual Decisioning Rubric

## Overview
Deciding when to let an agent run versus writing code manually is a core engineering skill. This rubric provides heuristics for senior engineers to make this decision safely.

## Heuristics

### Use an Agent when:
- The task is highly repetitive or boilerplate.
- The task is well-constrained and has a clear success metric.
- You need to explore multiple implementation options quickly.
- The context required is minimal and well-defined.

### Perform Manually when:
- The task involves complex architectural decisions or trade-offs.
- The task requires deep domain knowledge not present in the codebase.
- The agent has already failed or "wandered" in previous attempts.
- Security-critical code or trust roots are being modified.

## Stop Conditions
Stop the agent immediately if:
- It suggests changes outside the declared scope/non-goals (see [Prompt Specificity Standard](./prompt-packet.md)).
- It introduces new dependencies without explicit approval.
- It enters a loop or produces non-deterministic results.
- It fails to pass the defined acceptance tests after 2-3 attempts.

## Related
- [Senior Engineer Playbook](../../docs/ai-assist/senior-playbook.md)
- [MCP Tooling and Safety](./mcp-policy.md)
