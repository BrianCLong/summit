from plugins.materials.codec import decode_structure, encode_structure, StructureObj
import pytest

def test_roundtrip_valid():
    text = "LATTICE: 1.0 2.0 3.0\nSPECIES: Si O\nCOORDS: 0.0 0.0 0.0; 0.5 0.5 0.5"
    obj = decode_structure(text)
    assert obj.lattice == (1.0, 2.0, 3.0)
    assert obj.species == ("Si", "O")
    assert len(obj.coords) == 2

    encoded = encode_structure(obj)
    obj2 = decode_structure(encoded)
    assert obj == obj2
    assert encoded == text # Canonical check

def test_invalid_lattice():
    text = "LATTICE: 1.0 2.0\nSPECIES: Si\nCOORDS: 0.0 0.0 0.0"
    with pytest.raises(ValueError):
        decode_structure(text)

def test_mismatch_species_coords():
    text = "LATTICE: 1.0 2.0 3.0\nSPECIES: Si O\nCOORDS: 0.0 0.0 0.0"
    with pytest.raises(ValueError, match="mismatch"):
        decode_structure(text)
