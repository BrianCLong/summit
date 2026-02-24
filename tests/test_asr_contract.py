import pytest

from asr.provider import ASRProvider
from asr.providers.qwen3_asr_stub import Qwen3ASRProvider
from asr.types import ASRRequest, ASRResult, ASRSegment


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
    provider = Qwen3ASRProvider()
    request = ASRRequest(audio="clip.wav", audio_type="path")

    with pytest.raises(RuntimeError, match="SUMMIT_ASR_ENABLED"):
        provider.transcribe(request)


def test_qwen3_provider_not_implemented(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUMMIT_ASR_ENABLED", "1")
    provider = Qwen3ASRProvider()
    request = ASRRequest(audio="clip.wav", audio_type="path")

    with pytest.raises(NotImplementedError, match="clean-room stub"):
        provider.transcribe(request)
