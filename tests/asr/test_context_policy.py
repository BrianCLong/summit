import pytest
import os
from summit.audio.asr.policy.context_policy import validate_context
from summit.audio.asr.providers.qwen3_asr_provider import Qwen3ASRProvider
from summit.audio.asr.types import ASRRequest

def test_context_disabled_by_default(monkeypatch):
    monkeypatch.setenv("SUMMIT_ASR_ENABLED", "1")
    monkeypatch.setenv("FEATURE_QWEN3_ASR", "0")
    monkeypatch.delenv("ASR_CONTEXT_ENABLED", raising=False)

    with pytest.raises(RuntimeError, match="Promptable ASR context is disabled"):
        validate_context("some context")

def test_context_pii_denied(monkeypatch):
    monkeypatch.setenv("SUMMIT_ASR_ENABLED", "1")
    monkeypatch.setenv("ASR_CONTEXT_ENABLED", "1")

    with pytest.raises(ValueError, match="contains sensitive information"):
        validate_context("Contact me at user@example.com")

def test_context_too_long(monkeypatch):
    monkeypatch.setenv("SUMMIT_ASR_ENABLED", "1")
    monkeypatch.setenv("ASR_CONTEXT_ENABLED", "1")

    with pytest.raises(ValueError, match="exceeds maximum length"):
        validate_context("A" * 1001)

def test_context_allowed(monkeypatch):
    monkeypatch.setenv("SUMMIT_ASR_ENABLED", "1")
    monkeypatch.setenv("ASR_CONTEXT_ENABLED", "1")

    # Should not raise
    validate_context("This is a safe glossary: term1, term2.")

def test_provider_respects_context_policy(monkeypatch):
    monkeypatch.setenv("SUMMIT_ASR_ENABLED", "1")
    monkeypatch.setenv("ASR_CONTEXT_ENABLED", "0")
    monkeypatch.setenv("FEATURE_QWEN3_ASR", "0")

    provider = Qwen3ASRProvider()
    request = ASRRequest(audio="clip.wav", audio_type="path", context="some context")

    with pytest.raises(RuntimeError, match="Promptable ASR context is disabled"):
        provider.transcribe(request)
