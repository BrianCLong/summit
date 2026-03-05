# Autonomous Engineer V2 Standards

## Import / Export matrix
| System concept | Summit import | Summit export |
|----------------|---------------|---------------|
| Dyad planning questionnaire | agents/preflight/* | run_plan.json |
| Dyad persistent todos | agents/ledger/* | execution_ledger.json |
| Cursor multi-surface triggers | integrations/* (later) | webhook events (later) |
| Claude Code CLI agent loop | scripts/summit-agent | command logs + evidence |
| Devin ticket→plan→test→PR | agents/loop/* | PR-ready patch stack |
