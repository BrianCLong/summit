# Rollback Plan
Revert the PR. Delete the new prompts in `prompts/architecture/asf/`.
Delete the newly introduced ASF modules under `summit/skills/`, `summit/registry/`, `summit/skillforge/`.
Remove the playbook module `summit/acp/playbook.py`.
Remove the `prompts/registry.yaml` added hashes.
