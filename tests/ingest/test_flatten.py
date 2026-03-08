import pytest

from summit.ingest.flatten import StructuredFlattener
from summit.ingest.flatten_policy import FlatteningPolicy


def test_flattener_disabled_by_default():
    policy = FlatteningPolicy(enabled=False)
    flattener = StructuredFlattener(policy)
    data = {"name": "Test", "value": 123}
    # Should just return stringified JSON if disabled
    result = flattener.flatten(data)
    assert '"name": "Test"' in result
    assert '"value": 123' in result

def test_flattener_deterministic_output():
    policy = FlatteningPolicy(enabled=True)
    flattener = StructuredFlattener(policy)
    data = {"z": 1, "a": 2, "m": 3}
    result = flattener.flatten(data)
    # Alphabetical order: a, m, z
    assert result == "a: 2. m: 3. z: 1."

def test_flattener_nested_structure():
    policy = FlatteningPolicy(enabled=True)
    flattener = StructuredFlattener(policy)
    data = {
        "product": "Phone",
        "specs": {
            "color": "black",
            "storage": "128GB"
        }
    }
    result = flattener.flatten(data)
    assert "product: Phone" in result
    assert "specs.color: black" in result
    assert "specs.storage: 128GB" in result

def test_flattener_denylist():
    policy = FlatteningPolicy(enabled=True, denylist=["secret"])
    flattener = StructuredFlattener(policy)
    data = {"public": "hello", "secret": "don't show me"}
    result = flattener.flatten(data)
    assert "public: hello" in result
    assert "secret" not in result

def test_flattener_never_embed():
    policy = FlatteningPolicy(enabled=True)
    flattener = StructuredFlattener(policy)
    data = {"username": "jules", "password": "123"}
    result = flattener.flatten(data)
    assert "username: jules" in result
    assert "password" not in result

def test_flattener_list_handling():
    policy = FlatteningPolicy(enabled=True, max_list_items=2)
    flattener = StructuredFlattener(policy)
    data = {"tags": ["a", "b", "c", "d"]}
    result = flattener.flatten(data)
    assert "tags[0]: a" in result
    assert "tags[1]: b" in result
    assert "tags[2]" not in result
