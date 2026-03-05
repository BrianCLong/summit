# Autonomous Engineer v2 Performance & Cost Budgets

**Budgets (enforced in CI where reasonable):**
* Planning + validation: **< 250ms** local
* Patch generation step: **< 2s** (excluding model latency; track separately)
* Artifact size: **< 200KB** per run
* Max steps: **≤ 40** tool actions per run (configurable)
