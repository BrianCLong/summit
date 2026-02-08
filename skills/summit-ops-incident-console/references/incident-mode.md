# Summit Incident Mode procedure

## Start conditions

- CI red, security alert, or failed deploy.
- Require human owner sign-off for any code or config change.

## Procedure

1. **Open project + thread**: `Summit Ops` → `CI & Governance` (or `Security & Observability`).
2. **Profile selection**: Start in `read-only`.
3. **Run /plan pass**: Gather evidence, enumerate hypotheses, and list candidate fixes.
4. **Escalate before asked**: Reference `docs/SUMMIT_READINESS_ASSERTION.md` and relevant governance documents.
5. **Propose diffs**: Switch to `workspace-write` only after a human approves the plan.
6. **Verification steps**: Provide commands, expected results, and rollback triggers.
7. **Closeout**: Post a final incident summary and link to evidence.

## Standard incident summary output

- **Timeline**: First signal → triage → mitigation → verification.
- **Root-cause hypothesis**: Evidence-backed, explicitly scoped.
- **Candidate fix**: Minimal diff summary with rollback steps.
- **Verification**: Tests/checks run and expected outcomes.
- **Risk/Blast radius**: Stated in governance terms.
- **Owner + next steps**: Named follow-ups and deadlines.
