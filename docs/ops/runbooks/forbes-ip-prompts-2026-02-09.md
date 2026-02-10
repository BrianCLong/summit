# Runbook: IP Capture (Forbes Prompts)

## Overview
The `ip-capture` CLI tool processes markdown files into structured IP assets.

## Feature Flag
Enabled via `SUMMIT_FEATURE_IP_CAPTURE=1` (or `true`).
Default: **Disabled**.

## Usage
```bash
export SUMMIT_FEATURE_IP_CAPTURE=true
python -m summit.cli ip-capture --input ./my-experience.md --out ./dist/ip-assets
```

## Interpreting Outputs
- **`report.json`**: The core value. Look here for extracted methods.
- **`metrics.json`**: Check `redaction_count` to see if too much was filtered.
- **`stamp.json`**: Verifies the version and input hash.

## Troubleshooting

### "Feature Disabled" Error
- **Cause:** Flag not set.
- **Fix:** `export SUMMIT_FEATURE_IP_CAPTURE=true`

### "Empty Output"
- **Cause:** Input file empty or heavily redacted.
- **Fix:** Check `metrics.json` for redaction counts. Review input format.

### "Determinism Failure"
- **Cause:** Non-deterministic logic (timestamps, random seeds) introduced.
- **Fix:** Run `pytest -k ip_capture_determinism`.
