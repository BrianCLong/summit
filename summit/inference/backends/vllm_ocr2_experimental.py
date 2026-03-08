from __future__ import annotations

from typing import Any, Dict

from summit.flags import ENABLE_OCR2_VLLM_EXPERIMENTAL


class DeepseekOCR2VLLMBackend:
    """
    Experimental backend for DeepSeek-OCR-2 support in vLLM.
    This is a stub for future clean-room implementation.
    """
    def __init__(self, model_id: str):
        if not ENABLE_OCR2_VLLM_EXPERIMENTAL:
            raise RuntimeError("OCR2 VLLM Experimental backend is disabled.")
        self.model_id = model_id

    def run_inference(self, input_data: Any) -> dict[str, Any]:
        # TODO: Implement clean-room integration with vLLM's custom model registration
        return {"status": "experimental_not_implemented"}
