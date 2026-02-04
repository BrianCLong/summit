# Prompt: World Model Backend Scaffold (Lane 1)

Design a backend-agnostic world-model interface and kill-switch defaults for the
Summit platform. Focus on:

- `summit/worldmodels/interfaces.py`: action schema, step results, backend
  protocol, and capability descriptor.
- `summit/worldmodels/flags.py`: default-off env gating helpers.
- `summit/worldmodels/__init__.py`: export surface.
- `docs/worldmodels/overview.md`: contract + kill-switch documentation.
- `docs/roadmap/STATUS.json`: update the revision note and timestamp.

Constraints:

- Deny-by-default behavior; no backend auto-loading.
- No heavyweight dependencies.
- Keep interfaces minimal and typed.
