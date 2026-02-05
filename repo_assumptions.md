# Repo Assumptions & Validation (SAGE Self-Hinting / GRPO)

## Verified (local scan)

- **RL entrypoints**: Training and rollout entrypoints exist at `summit/train/entrypoint.py` and `summit/rollout/entrypoint.py` (both currently policy wiring stubs).【F:summit/train/entrypoint.py†L1-L7】【F:summit/rollout/entrypoint.py†L1-L7】
- **Post-training recipe seed**: A GRPO-related utility exists in `summit/post_training/recipes/typhoon_s/ink_grpo.py`, alongside a clean-room OPD trainer scaffold in `summit/post_training/recipes/typhoon_s/opd_trainer.py`.【F:summit/post_training/recipes/typhoon_s/ink_grpo.py†L1-L13】【F:summit/post_training/recipes/typhoon_s/opd_trainer.py†L1-L74】
- **Config system**: Configs are stored under both `config/` (YAML) and `configs/` (JSON/YAML), indicating dual config roots in current practice.【F:config/app.yaml†L1-L38】【F:configs/features.json†L1-L3】
- **CI workflow naming**: The `PR Quality Gate` workflow is defined in `.github/workflows/pr-quality-gate.yml`, with additional reusable CI workflows in the same directory (entry point for naming the gates).【F:.github/workflows/pr-quality-gate.yml†L1-L74】
- **Evidence conventions**: Deterministic evidence bundles live under `evidence/` and must include `report.json`, `metrics.json`, and `stamp.json`, with schema validation in `evidence/schemas/*.schema.json`.【F:evidence/README.md†L1-L36】

## Deferred pending validation

- **GRPO trainer / RL pipeline location**: Only the Typhoon-S `ink_grpo` helper is present; a full GRPO trainer module and rollout pipeline entrypoint remain **Deferred pending mapping**.
- **Evidence/report destination for RL runs**: `evidence/` is canonical, but an RL-specific reporting folder (e.g., `reports/` or `artifacts/`) is **Deferred pending alignment** with existing RL/ML pipelines.
- **Config schema**: Schema owners and validation hooks for new RL configs are **Deferred pending identification** of the active config loader for the RL stack.

## Must-not-touch (until validated)

- Release tooling and deployment manifests.
- Secrets, credentials, signing keys, and trust roots.
- `.github/workflows/*` unless a new CI job is explicitly required and approved.

## Next verification steps (for repo-exact PR paths)

1. Map RL trainer ownership: locate any training pipeline or trainer registry beyond `summit/train/entrypoint.py`.
2. Identify existing RL/ML report artifacts and align SAGE outputs to the same schema/paths.
3. Confirm config loader path for ML/RL (single source of truth) before adding `sage` config.
4. Confirm CI gate names from `pr-quality-gate.yml` and the RL/ML-specific workflows before attaching new checks.
