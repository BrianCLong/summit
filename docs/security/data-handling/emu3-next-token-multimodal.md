# Data Handling & Security: Emu3 Next-Token Multimodal

## Threat Model

| Threat | Description | Mitigation |
| :--- | :--- | :--- |
| **Sensitive Media Leakage** | Raw image/video bytes logged to console or disk. | **Strict No-Log Policy**: Only log SHA256 hashes and dimensions. Raw bytes are processed in memory or read from secure storage and never printed. |
| **Supply Chain Attack** | Malicious code in remote model weights (Hugging Face `trust_remote_code=True`). | **Opt-In Guard**: `trust_remote_code` is disabled by default. Requires explicit env var `SUMMIT_EMU3_TRUST_REMOTE_CODE=1`. Model IDs are pinned/checked via drift detector. |
| **Unexpected Egress** | CI/CD pipelines downloading massive models, causing cost/bandwidth spikes. | **CI Guard**: Model downloading is disabled in CI environments unless `SUMMIT_EMU3_ALLOW_MODEL_DOWNLOAD=1` is explicitly set. CI jobs verify this. |
| **Prompt Injection** | Malicious text in images (OCR) or prompts hijacking the model. | **Output Sanitization**: Outputs (captions, VQA) are treated as untrusted user input. Display layers must sanitize HTML/JS. |
| **Deceptive Generation** | Using Emu3 to generate deepfakes/misinfo. | **Generation Disabled**: Generation endpoints are not exposed in the default adapter. Requires code changes + feature flags to enable. |

## Data Classification

*   **Raw Media (Input)**: **Sensitive**. Retention governed by existing Summit ingestion policies.
*   **Derived Evidence (Caption/Tags)**: **Moderately Sensitive**. May contain PII inferred from media. Stored in secured Evidence Graph nodes.
*   **Metadata (Hashes/Dims)**: **Low Sensitivity**. Safe for logging (if not linked to PII in logs).
*   **Provenance Data**: **Low Sensitivity**. Public model IDs and timestamps.

## Retention Policy

*   **Default**: Keep derived evidence + provenance indefinitely (or per graph node TTL).
*   **Raw Media**: Not managed by Emu3 adapter (read-only access).

## "Never Log" List

1.  **Raw File Bytes**
2.  **Decoded Image Tensors**
3.  **Full OCR Dumps** (unless requested for evidence)
4.  **User Prompts** (if marked sensitive)
