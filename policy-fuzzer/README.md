# Policy Fuzzer

A Python tool that generates adversarial policy + query pairs to defeat governance layers (consent, licenses, geo, retention).

## Outputs

- **Enhanced HTML Report**: An interactive report with collapsible sections, color-coded severity levels, and a summary of the fuzzing run.
- **Reproducer Files**: For each failing case, a standalone Python script is generated to reproduce the issue.
- **Coverage Heatmap**: A visualization of the policy governance layers and rules that were exercised during the fuzzing run.
- **Text-based Reports**: Detailed text files for failing cases and coverage data.

## Usage

To run the fuzzer with all attack grammars enabled for 1000 iterations:

```bash
python main.py --iterations 1000 --enable-synonym-dodges --enable-regex-dodges --enable-time-window-hops --enable-field-aliasing --enable-data-type-mismatches
```

### Running Unit Tests

To run the unit tests for the query generator:

```bash
python -m unittest policy-fuzzer/tests/test_query_generator.py
```
