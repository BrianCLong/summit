# Subsumption Bundle Test Fixtures

These fixtures are used to test `tools/verify-subsumption-bundle.py`.

## Fixtures

### `valid-bundle/`
A complete, valid subsumption bundle with all required files and matching evidence IDs.
- **Expected Result**: PASS

### `invalid-missing-stamp/`
A bundle missing the required `stamp.json` file.
- **Expected Result**: FAIL (missing required file)

### `invalid-id-mismatch/`
A bundle where evidence IDs don't match across files.
- **Expected Result**: FAIL (evidence ID mismatch)

## Running Tests

```bash
# Test all fixtures
python3 tools/verify-subsumption-bundle.py --all-bundles test/fixtures/subsumption --verbose

# Test a single bundle
python3 tools/verify-subsumption-bundle.py --bundle test/fixtures/subsumption/valid-bundle --verbose

# CI mode (exit non-zero on failure)
python3 tools/verify-subsumption-bundle.py --all-bundles test/fixtures/subsumption --ci
```

## Bundle Structure

A valid subsumption bundle must contain:

```
bundle-name/
├── report.json    # Evidence report with artifacts list
├── metrics.json   # Bundle metrics
└── stamp.json     # Integrity stamp with evidence ID
```

All three files must have matching `evidence_id` fields.
