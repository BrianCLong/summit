import pytest
import os

from summit.audio.asr.provider import ASRProvider
from summit.audio.asr.providers.qwen3_asr_provider import Qwen3ASRProvider
from summit.audio.asr.types import ASRRequest, ASRResult, ASRSegment


class StubProvider(ASRProvider):
    def transcribe(self, req: ASRRequest) -> ASRResult:
        segment = ASRSegment(start_ms=None, end_ms=None, text=req.audio)
        return ASRResult(language=req.language, text=req.audio, segments=[segment])


def test_contract_roundtrip() -> None:
    provider = StubProvider()
    request = ASRRequest(audio="hello", audio_type="path", language="en")

    result = provider.transcribe(request)

    assert result.language == "en"
    assert result.text == "hello"
    assert result.segments == [ASRSegment(start_ms=None, end_ms=None, text="hello")]


def test_qwen3_provider_disabled_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SUMMIT_ASR_ENABLED", raising=False)
    monkeypatch.setenv("FEATURE_QWEN3_ASR", "0")
    provider = Qwen3ASRProvider()
    request = ASRRequest(audio="clip.wav", audio_type="path")

    with pytest.raises(RuntimeError, match="disabled"):
        provider.transcribe(request)


def test_qwen3_provider_mock_output(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUMMIT_ASR_ENABLED", "1")
    monkeypatch.setenv("RUN_ASR_INTEGRATION", "0")
    provider = Qwen3ASRProvider(backend="transformers")
    request = ASRRequest(audio="clip.wav", audio_type="path")

    result = provider.transcribe(request)
    assert "[Transformers Mock]" in result.text

def test_qwen3_provider_vllm_mock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUMMIT_ASR_ENABLED", "1")
    monkeypatch.setenv("RUN_ASR_INTEGRATION", "0")
    monkeypatch.setenv("ASR_BACKEND", "vllm")
    provider = Qwen3ASRProvider()
    request = ASRRequest(audio="clip.wav", audio_type="path")

    result = provider.transcribe(request)
    assert "[vLLM Mock]" in result.text

def test_qwen3_provider_timestamps(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUMMIT_ASR_ENABLED", "1")
    monkeypatch.setenv("RUN_ASR_INTEGRATION", "0")
    provider = Qwen3ASRProvider(backend="transformers")
    request = ASRRequest(audio="clip.wav", audio_type="path", return_timestamps=True)

    result = provider.transcribe(request)
    assert result.segments[0].start_ms == 0
    assert result.segments[0].end_ms == 1000

def test_qwen3_provider_no_timestamps(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUMMIT_ASR_ENABLED", "1")
    monkeypatch.setenv("RUN_ASR_INTEGRATION", "0")
    provider = Qwen3ASRProvider(backend="transformers")
    request = ASRRequest(audio="clip.wav", audio_type="path", return_timestamps=False)

    result = provider.transcribe(request)
    assert result.segments[0].start_ms is None
    assert result.segments[0].end_ms is None

def test_asr_request_new_fields():
    req = ASRRequest(
        audio="clip.wav",
        audio_type="path",
        device="cuda",
        attention_backend="flash"
    )
    assert req.device == "cuda"
    assert req.attention_backend == "flash"
