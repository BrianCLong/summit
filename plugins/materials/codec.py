from __future__ import annotations
from dataclasses import dataclass
from typing import Tuple

@dataclass(frozen=True)
class StructureObj:
    lattice: Tuple[float, float, float]
    species: Tuple[str, ...]
    coords: Tuple[Tuple[float, float, float], ...]

GRAMMAR_VERSION = "toy-v1"

def decode_structure(text: str) -> StructureObj:
    """
    Deterministic, invertible decoder for StructureText.
    Format:
    LATTICE: <float> <float> <float>
    SPECIES: <str> ...
    COORDS: <float> <float> <float>; ...
    """
    lines = text.strip().split('\n')
    lattice_line = [l for l in lines if l.startswith('LATTICE:')]
    species_line = [l for l in lines if l.startswith('SPECIES:')]
    coords_line = [l for l in lines if l.startswith('COORDS:')]

    if not (lattice_line and species_line and coords_line):
        raise ValueError("Missing required sections")

    try:
        lat_parts = lattice_line[0].replace('LATTICE:', '').strip().split()
        if len(lat_parts) != 3:
             raise ValueError("Lattice must have 3 components")
        lattice = (float(lat_parts[0]), float(lat_parts[1]), float(lat_parts[2]))

        species = tuple(species_line[0].replace('SPECIES:', '').strip().split())

        coords_str = coords_line[0].replace('COORDS:', '').strip()
        coords_list = []
        if coords_str:
            for c in coords_str.split(';'):
                c = c.strip()
                if not c: continue
                parts = c.split()
                if len(parts) != 3:
                     raise ValueError(f"Coord must have 3 components: {c}")
                coords_list.append((float(parts[0]), float(parts[1]), float(parts[2])))

        if len(species) != len(coords_list):
             raise ValueError("Species and coords count mismatch")

        coords = tuple(coords_list)

    except ValueError as e:
        raise ValueError(f"Parse error: {e}")

    return StructureObj(lattice=lattice, species=species, coords=coords)

def encode_structure(obj: StructureObj) -> str:
    """Canonical encoder; round-trip must match."""
    lat_str = f"{obj.lattice[0]} {obj.lattice[1]} {obj.lattice[2]}"
    spec_str = " ".join(obj.species)
    coords_str = "; ".join([f"{c[0]} {c[1]} {c[2]}" for c in obj.coords])

    return f"LATTICE: {lat_str}\nSPECIES: {spec_str}\nCOORDS: {coords_str}"
