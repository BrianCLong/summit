from runtime_security.flags import runtime_security_enabled


def test_disabled_by_default(monkeypatch):
    monkeypatch.delenv("SUMMIT_RUNTIME_SECURITY", raising=False)
    assert runtime_security_enabled() is False
