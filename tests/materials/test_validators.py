from plugins.materials.codec import StructureObj
from plugins.materials.validators import validate_invariants


def test_validate_valid():
    obj = StructureObj((1.0, 1.0, 1.0), ("Si",), ((0.0, 0.0, 0.0),))
    issues = validate_invariants(obj)
    assert not issues

def test_validate_negative_lattice():
    obj = StructureObj((-1.0, 1.0, 1.0), ("Si",), ((0.0, 0.0, 0.0),))
    issues = validate_invariants(obj)
    assert "Lattice constants must be positive" in issues

def test_validate_empty():
    obj = StructureObj((1.0, 1.0, 1.0), (), ())
    issues = validate_invariants(obj)
    assert "Structure must have at least one atom" in issues
