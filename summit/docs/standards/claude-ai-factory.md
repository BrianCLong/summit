# Claude AI Factory Standards

## Formats
- Prompt format: structured YAML or markdown
- Plan schema: JSON Draft 2020-12
- Evidence id pattern: `EID:AF:<item-slug>:<stage>:<seq>`
- Verification: GitHub Actions

## Input/Export Matrix
| Component | Input | Output |
| :--- | :--- | :--- |
| Planner | issue text, repo profile, claim registry | plan/report.json |
| Splitter | plan | fanout/stack.json |
| PR generator | work item, repo rules | diff.patch, metrics.json, evidence.json |
| Architecture reviewer | diff, ownership map, path policy | architecture-review.json |
| Policy reviewer | diff, threat rules, data rules | policy-review.json |
| CI healer | failing checks, logs, allowlist | self-heal-report.json, optional patch |
| Merge guardian | all prior outputs | release-readiness.json |

## Guidelines
- JSON schemas must be used for every stage.
- Deterministic output files exclude unstable timestamps.
- `stamp.json` may contain wall-clock data, but deterministic comparisons ignore it.
- All agents must emit `claim_refs[]`, `touched_paths[]`, and `risk_level`.
- No autonomous merge to main.
- No autonomous secrets changes.
