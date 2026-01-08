# CI Triage Pack

The `ci:triage` script is designed to capture and classify CI failures, generating a comprehensive triage pack to assist in debugging.

## Usage

### Local Usage

You can use `pnpm ci:triage` to analyze a log file and generate a triage pack.

```bash
pnpm ci:triage --cmd "<command_that_failed>" --log-file <path_to_log_file> [--output-dir <output_directory>]
```

**Example:**

```bash
# Capture output of a failing test
pnpm test > test_output.log 2>&1

# Generate triage pack
pnpm ci:triage --cmd "pnpm test" --log-file test_output.log
```

This will generate an `artifacts/triage` directory containing:
*   `triage.json`: Machine-readable summary of the failure.
*   `triage.md`: Human-readable markdown report.
*   `failing_tests.txt`: List of failing tests (if detectable).

### CI Integration

The triage pack is automatically generated in CI workflows (`ci.yml`, `ci-verify.yml`) when a job fails. The artifacts are uploaded as `triage-<job_name>`.

## Heuristics

The script uses simple heuristics to classify failures:

*   **path-length**: `ENAMETOOLONG` or "File name too long"
*   **network-listen constraint**: `EADDRINUSE` or "address already in use"
*   **timeout**: `ETIMEDOUT`, "Timeout", or "timed out"
*   **test failure**: "Jest failed" or "Tests failed", or JUnit XML failure detection
*   **unknown**: Default classification

## Artifacts

*   **triage.json**:
    ```json
    {
      "command": "pnpm test",
      "classification": "test failure",
      "failingTestCount": 2,
      "failingTests": ["src/foo.test.ts", "src/bar.test.ts"],
      "rerunCommand": "pnpm test",
      "timestamp": "2023-10-27T10:00:00.000Z"
    }
    ```
*   **triage.md**: A markdown report suitable for GitHub comments or issue descriptions.
*   **failing_tests.txt**: A newline-separated list of failing tests, useful for passing to test runners for retries.
