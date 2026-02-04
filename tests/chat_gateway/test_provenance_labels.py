from summit.chat_gateway.connectors.mock import MockConnector


def test_mock_applies_untrusted_provenance_by_default():
    conn = MockConnector(incoming=[{"text": "hello"}])
    msg = conn.receive()
    assert msg["provenance"] == "untrusted_external"

def test_mock_preserves_provenance():
    conn = MockConnector(incoming=[{"text": "hello", "provenance": "trusted_user"}])
    msg = conn.receive()
    assert msg["provenance"] == "trusted_user"
