from agentic_web_visibility.policy.neverlog import audit_event


def test_audit_safe():
    event = {"id": "1", "data": {"foo": "bar"}}
    assert audit_event(event) is True

def test_audit_unsafe_key():
    event = {"id": "1", "token": "secret"}
    assert audit_event(event) is False

    event = {"id": "1", "data": {"password": "123"}}
    assert audit_event(event) is False

def test_audit_unsafe_nested():
    event = {"list": [{"safe": 1}, {"authorization": "Bearer x"}]}
    assert audit_event(event) is False
