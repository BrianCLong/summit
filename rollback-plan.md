# Rollback Plan

Roll back the implementation of the ASF modules by performing `git revert <commit_hash>`.
If this fails, manually remove the `summit/skills/models.py`, `summit/registry/service.py`, `summit/skillforge/discovery.py`, `summit/skillforge/refiner.py`, `summit/skills/lifecycle.py`, and `summit/acp/playbook.py` files and the references in `prompts/registry.yaml`.
