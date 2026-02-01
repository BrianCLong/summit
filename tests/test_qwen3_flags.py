import pytest
from summit.audio.tts.qwen3.adapter import Qwen3TTSAdapter, Qwen3TTSRequest
from summit.flags import FEATURE_QWEN3_TTS

def test_adapter_disabled_by_default():
    # FEATURE_QWEN3_TTS defaults to False in flags.py
    adapter = Qwen3TTSAdapter(enabled=FEATURE_QWEN3_TTS)
    req = Qwen3TTSRequest(text="Hello")

    with pytest.raises(RuntimeError) as excinfo:
        adapter.synthesize(req)
    assert "qwen3_tts disabled by feature flag" in str(excinfo.value)

def test_adapter_enabled():
    adapter = Qwen3TTSAdapter(enabled=True)
    req = Qwen3TTSRequest(text="Hello")
    res = adapter.synthesize(req)
    assert res["sample_rate"] == 0
    assert res["metrics"]["attention_backend"] == "auto"
