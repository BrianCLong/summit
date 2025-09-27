# Redaction Quality Benchmark (RQB)

RQB provides a deterministic harness for evaluating PII redaction detectors. It
ships with a labeled ground-truth corpus that mixes natural language snippets
and structured JSON logs. The toolkit produces precision/recall metrics, entity
confusion matrices, latency profiles, and exportable JSON scorecards. A CI gate
script compares scorecards to block regressions.

## Quick start

```bash
python -m tools.rqb.cli --detector regex --scorecard /tmp/rqb-regex.json
```

Available detectors:

- `regex`: production-ready deterministic baseline.
- `ml-stub`: seeded ML-style detector that introduces controlled error for
  regression testing.

## CI gate

Use the provided script to compare a candidate scorecard against a baseline
(checking precision, recall, and F1 drops by default):

```bash
python -m tools.rqb.ci_gate tools/rqb/baselines/regex.json /tmp/rqb-regex.json --max-drop 0.02
```

## Extending

1. Implement `Detector.detect` for your detector and expose it via
   `tools.rqb.cli._DETECTOR_FACTORIES`.
2. Run the harness to generate a baseline scorecard.
3. Wire the CI gate into your pipeline to block regressions above the
   configured threshold.
