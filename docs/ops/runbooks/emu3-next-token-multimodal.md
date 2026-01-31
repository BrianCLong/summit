# Runbook: Emu3 Multimodal Adapter

## Service Overview
The Emu3 adapter (`ai-ml-suite/emu3`) provides on-demand multimodal analysis (captioning, VQA) for the Summit platform. It runs as a Python library/CLI invoked by ingestion pipelines.

## Configuration
Controlled via Environment Variables:

*   `SUMMIT_EMU3_BACKEND`: `dummy` (default) or `hf` (Hugging Face).
*   `SUMMIT_EMU3_ALLOW_MODEL_DOWNLOAD`: Set to `1` to allow runtime model fetching. **Default: 0**.
*   `SUMMIT_EMU3_MODEL_ID`: Hugging Face model ID (e.g., `baaivision/Emu3-Chat`).
*   `SUMMIT_EMU3_TOKENIZER_ID`: Hugging Face tokenizer ID.
*   `SUMMIT_EMU3_TRUST_REMOTE_CODE`: Set to `1` to allow execution of remote model code. **Risk: High**.

## Common Issues

### 1. "Model Download Disabled" Error
**Symptom**: `RuntimeError: Model download is disabled.`
**Cause**: The backend attempted to fetch weights but `SUMMIT_EMU3_ALLOW_MODEL_DOWNLOAD` is not set.
**Fix**:
1.  If intended (prod/CI): Ensure weights are pre-mounted.
2.  If testing/dev: `export SUMMIT_EMU3_ALLOW_MODEL_DOWNLOAD=1`.

### 2. "Trust Remote Code" Error
**Symptom**: `ValueError: specific model requires trust_remote_code=True`
**Cause**: Emu3 requires custom code execution from HF Hub.
**Fix**: Verify the model ID is trusted. Set `export SUMMIT_EMU3_TRUST_REMOTE_CODE=1`.

### 3. Drift Detection Alert
**Symptom**: `scripts/monitoring/emu3-next-token-multimodal-drift.py` fails.
**Cause**: The configured model ID or tokenizer version does not match the pinned/approved versions.
**Fix**:
1.  Check `artifacts/emu3/drift.json`.
2.  Update pinned versions if the upgrade is intentional.
3.  Revert config if accidental.

## Maintenance
*   **Updates**: Emu3 is an active research model. Monitor `baaivision/Emu3` for updates.
*   **Drift Check**: Run `scripts/monitoring/emu3-next-token-multimodal-drift.py` weekly.
