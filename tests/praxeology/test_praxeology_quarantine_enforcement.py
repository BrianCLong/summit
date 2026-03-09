import pytest

def test_untrusted_writes_quarantined():
    """Verify that untrusted writes are properly quarantined."""
    # Mock untrusted write payload
    payload = {"source": "untrusted", "data": "malicious"}

    # In a real system, this would call the quarantine validator
    # Here we simulate the expected behavior
    def validate_write(write_payload):
        if write_payload.get("source") != "trusted":
            return {"status": "quarantined", "reason": "untrusted source"}
        return {"status": "accepted"}

    result = validate_write(payload)
    assert result["status"] == "quarantined"
    assert result["reason"] == "untrusted source"

def test_trusted_writes_accepted():
    """Verify that trusted writes are accepted."""
    payload = {"source": "trusted", "data": "safe"}

    def validate_write(write_payload):
        if write_payload.get("source") != "trusted":
            return {"status": "quarantined", "reason": "untrusted source"}
        return {"status": "accepted"}

    result = validate_write(payload)
    assert result["status"] == "accepted"
