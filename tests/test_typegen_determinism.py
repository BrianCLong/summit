import json

from codemode.typegen import thin_signature


def test_determinism_sorted_keys():
    schema = {
        "properties": {
            "b": {"type": "string"},
            "a": {"type": "number"}
        },
        "required": ["b"]
    }
    # Should be sorted a, b
    # b is required, a is optional
    sig = thin_signature("my_tool", schema)
    expected = "my_tool(a?: number, b: string) -> any"
    assert sig == expected

def test_optional_marker():
    schema = {
        "properties": {
            "x": {"type": "string"}
        }
        # x not in required -> optional
    }
    sig = thin_signature("test", schema)
    assert sig == "test(x?: string) -> any"

def test_nested_any_fallback():
    schema = {
        "properties": {
            "obj": {"type": "object", "properties": {"nested": {"type": "string"}}}
        }
    }
    # Currently fallback to just type name "object"
    sig = thin_signature("complex", schema)
    assert sig == "complex(obj?: object) -> any"

def test_stable_output_across_runs():
    schema = {
        "properties": {
            "z": {"type": "string"},
            "y": {"type": "string"},
            "x": {"type": "string"}
        }
    }
    sig1 = thin_signature("stable", schema)
    sig2 = thin_signature("stable", schema)
    assert sig1 == sig2
    assert sig1 == "stable(x?: string, y?: string, z?: string) -> any"
