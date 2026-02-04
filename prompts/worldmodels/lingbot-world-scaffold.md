# Prompt: LingBot-World Scaffold (Lane 1)

Objective: Add clean-room world model interface scaffolding, documentation, and third-party attribution for LingBot-World alignment. Keep functionality disabled by default and update roadmap status.

## Requirements

- Create minimal world model interfaces and feature flags under `summit/worldmodels/`.
- Add docs under `docs/items/2601-20540-lingbot-world/` and `docs/worldmodels/`.
- Update `NOTICE.third_party.md` with LingBot-World attribution (clean-room).
- Update `docs/roadmap/STATUS.json` with a revision note and timestamp.

## Constraints

- Do not copy LingBot-World code or datasets.
- Keep all functionality gated behind `SUMMIT_WORLDMODEL_ENABLE`.
- No heavyweight dependencies.
