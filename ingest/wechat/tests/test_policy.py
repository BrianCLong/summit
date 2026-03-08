import pytest

from ingest.wechat.utils import redact_sensitive
from ingest.wechat.validate import UrlRejected, canonicalize_and_validate


def test_policy_allowlist():
    # Positive
    assert canonicalize_and_validate("https://mp.weixin.qq.com/s/123").host == "mp.weixin.qq.com"

    # Negative
    with pytest.raises(UrlRejected, match="host_not_allowlisted"):
        canonicalize_and_validate("https://malicious.com/s/123")


def test_policy_schemes():
    with pytest.raises(UrlRejected, match="scheme_not_allowed"):
        canonicalize_and_validate("javascript:alert(1)")
    with pytest.raises(UrlRejected, match="scheme_not_allowed"):
        canonicalize_and_validate("file:///etc/passwd")


def test_redaction():
    raw = "Sending request with Bearer abc.123.xyz and Cookie: session=12345"
    redacted = redact_sensitive(raw)
    assert "[REDACTED]" in redacted
    assert "abc.123.xyz" not in redacted
    assert "12345" not in redacted
