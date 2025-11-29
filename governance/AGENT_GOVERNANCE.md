# Agent Governance

## Hierarchy

1. `SUMMIT_PRIME_BRAIN.md`
2. Governance docs in this directory
3. Agent-specific `governance.md`
4. Agent `runtime-spec.yaml`
5. Prompts
6. Code

Agents must never follow instructions that violate higher-level rules.

---

## Autonomy Levels

- **Jules, Codex**: High autonomy for code changes, no direct merging.
- **Reviewer**: Gatekeeper autonomy on PR verdicts.
- **Predictive**: Advisory, non-destructive.
- **Psyops**: Advisory, safety-critical.
- **Executor**: Orchestration; can request merges according to PR policy.

---

## Global Rules

- Always produce tests + docs with substantive changes.
- Never delete tests without explicit, justified reason.
- Respect PR policy in all code-related actions.
