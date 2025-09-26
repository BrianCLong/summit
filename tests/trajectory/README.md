# Trajectory Golden‑Set

Each YAML file defines a ReAct trace and expected invariants.

## File Schema
- `id`: unique id (string)
- `description`: short text
- `steps`: ordered array of steps with fields:
  - `role`: one of [thought, action, observation]
  - `label`: optional label for action/tool
  - `text`: content
- `expectations`:
  - `must_include_labels`: [string]
  - `forbid_labels`: [string]
  - `max_steps`: integer
  - `outcome_contains`: [string]

The validator enforces:
- Step order alternation (thought→action→observation patterns)
- Presence/absence of labels
- Max length/step caps
- Outcome text contains required substrings

It outputs JUnit (for Checks UI) + JSON + Markdown.
