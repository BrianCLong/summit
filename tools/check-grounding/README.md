# Grounding Verifier

Place case files under `tools/check-grounding/cases/*.json` in the schema shown in the main README. The CI job will fail if the average score < `GROUNDING_MIN_SCORE` or if any gaps > `GROUNDING_MAX_GAPS`.