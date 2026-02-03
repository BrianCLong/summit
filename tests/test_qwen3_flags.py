import pytest
import summit.flags
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

from summit.audio.asr.providers.qwen3_asr_provider import Qwen3ASRProvider
from summit.audio.asr.types import ASRRequest
from summit.flags import FEATURE_QWEN3_ASR

def test_asr_provider_respects_flags(monkeypatch):
    monkeypatch.setenv("SUMMIT_ASR_ENABLED", "0")
    monkeypatch.setattr(summit.flags, "FEATURE_QWEN3_ASR", False)
    provider = Qwen3ASRProvider()
    req = ASRRequest(audio="clip.wav", audio_type="path")

    with pytest.raises(RuntimeError, match="disabled"):
        provider.transcribe(req)

def test_asr_provider_enabled_by_feature_flag(monkeypatch):
    monkeypatch.setenv("SUMMIT_ASR_ENABLED", "0")
    monkeypatch.setattr(summit.flags, "FEATURE_QWEN3_ASR", True)
    monkeypatch.setenv("RUN_ASR_INTEGRATION", "0")
    provider = Qwen3ASRProvider()
    req = ASRRequest(audio="clip.wav", audio_type="path")

    result = provider.transcribe(req)
    assert "[Transformers Mock]" in result.text
