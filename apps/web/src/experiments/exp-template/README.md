# Experiment Template

Copy this folder to `apps/web/src/experiments/<experiment-id>/` and update:

- `registry.ts` entry (owner, flag, expiration)
- `learningGoals` and `instrumentation`
- Use `ExperimentalGate` to render UI behind a flag

Keep implementations read-only with no GA writes.
