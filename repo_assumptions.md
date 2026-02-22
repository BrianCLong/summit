# Repo Reality Check

## Verified
* `summit` is the root python package.
* `summit/post_training/recipes/typhoon_s/opd_trainer.py` exists and uses PyTorch.
* `summit/post_training/recipes/typhoon_s/ink_grpo.py` exists but is only a config dataclass.
* `tools/summit-fara` contains an agent loop with placeholder GRPO comments.

## Assumed (and will be created)
* `summit/rl` will be the new home for the RL pipeline to support SAGE.
* `summit/rl/trainers/grpo.py` will be created (or mocked) as the target for SAGE integration.
* Evidence artifacts will be stored in `reports/sage-self-hint-grpo/` following the pattern seen in `summit/evidence/templates`.

## Must-not-touch
* `summit/post_training/recipes/typhoon_s/*` (unless strictly necessary, will leave as is).
* `packages/*` (TypeScript/Node.js code).
