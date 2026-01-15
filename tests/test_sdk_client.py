from intelgraph.sdk import IntelGraphClient


def test_basic_allow():
    client = IntelGraphClient()
    result = client.process("hello")
    assert result["ok"]
    assert result["redacted_text"] == "hello"


def test_with_redactor():
    class StubRedactor:
        def redact_text(self, text):
            return text.replace("secret", "[REDACTED]")

    client = IntelGraphClient(redactor=StubRedactor())
    result = client.process("this is secret")
    assert result["ok"]
    assert result["redacted_text"] == "this is [REDACTED]"


def test_with_policy_deny():
    class DenyEngine:
        def decide(self, req):
            return "deny", "testing"

    client = IntelGraphClient(policy_engine=DenyEngine())
    result = client.process("hello")
    assert not result["ok"]
    assert result["error"] == "policy_denied"
    assert result["policy"]["reason"] == "testing"
