# Emu3 Next-Token Multimodal Evidence Standard (MediaEvidenceV1)

## Overview
This standard defines the integration of Emu3 (a next-token prediction multimodal model) into the Summit platform for **defensive intelligence analysis**. The primary goal is to normalize multimodal evidence (images, video) into structured, auditable token-derived outputs (captions, tags, QA, scene summaries) that can be attached to graph entities.

## Evidence ID Format
All Emu3-generated evidence must strictly adhere to the following ID format:

`EVID:emu3-ntp:<sha256_12>:<mode>:v1`

*   `emu3-ntp`: Namespace for Emu3 Next-Token Prediction.
*   `<sha256_12>`: The first 12 characters of the SHA256 hash of the input media file.
*   `<mode>`: The operation mode (e.g., `caption`, `vqa`, `video-consistency`).
*   `v1`: Schema version.

**Example:** `EVID:emu3-ntp:1a2b3c4d5e6f:caption:v1`

## Import/Export Matrix

### Imports
*   **Media**: Images (JPG, PNG), Video (MP4) - strictly read-only.
*   **Text**: Optional questions (for VQA) or context.
*   **Metadata**: File hash (SHA256), dimensions, size.

### Exports
*   **MediaEvidenceV1 JSON**: The primary structured output.
*   **Provenance JSON**: Metadata about the model, tokenizer, and backend used.
*   **Graph Envelope**: (Optional) Enriched node structure for graph ingestion.

## MediaEvidenceV1 Schema (High-Level)
```json
{
  "evidence_id": "EVID:emu3-ntp:...",
  "mode": "caption",
  "content": {
    "caption": "A cat sitting on a mat.",
    "tags": ["cat", "mat", "indoor"],
    "qa": []
  },
  "provenance": {
    "backend": "hf_emu3",
    "model_id": "baaivision/Emu3-Chat",
    "tokenizer_id": "baaivision/Emu3-VisionTokenizer",
    "input_sha256": "...",
    "timestamp": "..."
  }
}
```

## Non-Goals
*   **Training/Finetuning**: Summit does not train Emu3 models.
*   **Generation**: Image/Video generation capabilities are **disabled by default** and hidden behind feature flags.
*   **Weight Distribution**: Summit does not ship model weights. Weights are downloaded at runtime (opt-in) or mounted.
