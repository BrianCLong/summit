import pytest
from summit.brand_story.policy import BrandStoryPolicy

def test_policy_deny_pii():
    policy = BrandStoryPolicy()
    unsafe_content = "Contact me at test@example.com for secret info."
    result = policy.validate_content(unsafe_content)
    assert not result["is_safe"]
    assert any("Pattern matched" in v for v in result["violations"])

def test_policy_allow_safe():
    policy = BrandStoryPolicy()
    safe_content = "Building a magnetic personal brand through storytelling."
    result = policy.validate_content(safe_content)
    assert result["is_safe"]
    assert len(result["violations"]) == 0

def test_redaction():
    policy = BrandStoryPolicy()
    unsafe_content = "My SSN is 123-45-6789."
    redacted = policy.redact_content(unsafe_content)
    assert "[REDACTED]" in redacted
    assert "123-45-6789" not in redacted
