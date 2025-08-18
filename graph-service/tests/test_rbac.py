import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

import rbac


def test_scope_cypher_analyst():
    q, params = rbac.scope_cypher("MATCH (n) RETURN n", "analyst", "alice")
    assert "WHERE n.created_by = $user" in q
    assert params["user"] == "alice"


def test_scope_cypher_reviewer():
    q, params = rbac.scope_cypher("MATCH (n) RETURN n", "reviewer", "bob")
    assert q == "MATCH (n) RETURN n"
    assert params == {}


def test_check_access_denied():
    try:
        rbac.check_access({"created_by": "bob"}, "analyst", "alice")
    except PermissionError:
        pass
    else:  # pragma: no cover - should not reach
        raise AssertionError("PermissionError not raised")
