import pytest
from summit.security.policy import DEFAULT_POLICY, SecurityViolation

def test_allowed_tool():
    # allowed
    DEFAULT_POLICY.enforce({"name": "read_file"})

def test_denied_tool():
    # denied
    with pytest.raises(SecurityViolation):
        DEFAULT_POLICY.enforce({"name": "curl_evil_site"})

def test_injection_attempt():
    # simulated injection trying to use a system tool
    with pytest.raises(SecurityViolation):
        DEFAULT_POLICY.enforce({"name": "rm -rf /"})
