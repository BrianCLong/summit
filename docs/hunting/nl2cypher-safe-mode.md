# NL→Cypher Safe Mode

The Copilot translates redacted natural language prompts into read-only Cypher plans.

1. Prompts are redacted on-device and hashed for logging.
2. Planner returns Cypher, parameters, cost estimate, and explain plan.
3. QueryBudgetGuard enforces execution budgets in the sandbox.
4. Plans may be promoted to persisted queries after reviewer approval.
