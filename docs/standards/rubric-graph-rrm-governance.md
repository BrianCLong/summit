# Interop & Standards Mapping

| Interface | In | Out | Non-goals |
| --- | --- | --- | --- |
| RubricBench | JSON/JSONL | normalized dataset | training other org models |
| Rubric Graph | instruction/rubric/eval/policy | graph.json | full KG DB requirement |
| RRM | features | reward score | online RLHF |
| Governance | policy + reward | allow/deny + audit | replacing entire auth |
