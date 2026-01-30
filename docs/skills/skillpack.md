# Summit SkillPack Format

Summit uses a file-system based "Skill" format, inspired by the Agent Skills open standard.

## Directory Structure

```
skills/
  <skill_id>/
    skill.yaml        # L1 Metadata
    SKILL.md          # L2 Instructions
    resources/        # L3 Scripts/Assets
```

## Progressive Disclosure

1. **Level 1 (Metadata)**: `skill.yaml` is loaded at startup. Contains ID, name, description.
2. **Level 2 (Instructions)**: `SKILL.md` is loaded only when the skill is explicitly triggered.
3. **Level 3 (Resources)**: Files in `resources/` are accessed only when needed by the execution.
