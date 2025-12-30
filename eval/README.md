# MVP-4 GA Evaluation Harness

This directory contains a lightweight evaluation harness for measuring the quality of the IntelGraph MVP-4 release. It is designed to be run locally and in CI/CD pipelines.

## Structure

- `datasets/`: Contains evaluation datasets (JSONL format).
- `run.ts`: The main runner script.
- `scorer.ts`: Logic for scoring responses against criteria.
- `types.ts`: Zod schemas for validation.
- `reports/`: Generated output reports (gitignored).

## Usage

### Prerequisites

Ensure dependencies are installed:

```bash
pnpm install
```

### Running an Evaluation

To run the evaluation in **mock mode** (no external API calls):

```bash
npx tsx eval/run.ts --mock
```

To run with a specific dataset:

```bash
npx tsx eval/run.ts --dataset eval/datasets/custom.jsonl
```

### Output

The runner generates a JSON report in `eval/reports/report.json` (or specified path).

Example output:

```json
{
  "timestamp": "2023-10-27T10:00:00.000Z",
  "config": { "mock": true },
  "results": [
    {
      "input": "...",
      "score": 1,
      "pass": true,
      "evidence": { "stub": true }
    }
  ],
  "summary": {
    "total": 10,
    "passed": 10,
    "accuracy": 1.0
  }
}
```

## Adding New Tests

1. Add a new line to `eval/datasets/mvp4ga-mini.jsonl`.
2. Format: `{"input": "Question", "expected": "Answer", "criteria": "Exact match: Answer"}`.

## CI Integration

This harness is designed to be run as a step in the CI pipeline:

```yaml
- name: Run MVP-4 GA Eval
  run: npx tsx eval/run.ts --mock
```

## Testing the Harness

To run the unit tests for the harness itself:

```bash
npx jest eval/__tests__/scorer.test.ts --config eval/jest.config.cjs
```
