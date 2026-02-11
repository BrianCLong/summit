import pytest
from summit.audio.voice.consent import require_consent

def test_deny_without_consent():
    with pytest.raises(PermissionError) as excinfo:
        require_consent(None)
    assert "voice_clone requires consent.proof" in str(excinfo.value)

def test_allow_with_consent():
    # Should not raise
    require_consent("I_HAVE_RIGHTS_ATTESTATION_V1")

def test_deny_invalid_consent():
    with pytest.raises(PermissionError) as excinfo:
        require_consent("INVALID_TOKEN")
    assert "Invalid or unsupported consent.proof" in str(excinfo.value)
