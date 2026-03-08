from summit.records.model import Record
from summit.records.policy import check_access


def test_deny_by_default():
    r = Record("rec1","alice","confidential", permissions={}, provenance=[], payload_ref="blob://x")
    assert check_access(r, "bob", "read") is False

def test_allow_positive():
    r = Record("rec1","alice","confidential", permissions={"bob":["read"]}, provenance=[], payload_ref="blob://x")
    assert check_access(r, "bob", "read") is True

def test_action_mismatch():
    r = Record("rec1","alice","confidential", permissions={"bob":["write"]}, provenance=[], payload_ref="blob://x")
    assert check_access(r, "bob", "read") is False
