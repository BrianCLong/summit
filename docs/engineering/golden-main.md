# Golden Main

**"All required checks are green on the last 3 main‑branch commits."**

This standard ensures a healthy main branch by smoothing over one-off flakiness without waiting days for "stability".

## Why this works

* **Resists flakes:** one green commit can be lucky; three in a row is signal.
* **Fast feedback:** no need to watch a full week—your bar updates with every push.
* **Auditable:** easy to show to execs/auditors as an objective gate.

## Implementation

* **Definition:** Added to `docs/engineering/golden-main.md`.
* **Automation:** `.github/workflows/golden-main.yml` computes the last 3 `main` commits and verifies all required checks passed.
* **Visibility:** Badge in `README.md`.
