from __future__ import annotations
from .codec import StructureObj

def validate_invariants(obj: StructureObj) -> list[str]:
    """
    Returns list of invariant violations (empty = pass).
    Keep this pure + deterministic.
    """
    issues: list[str] = []

    # 1. Lattice constants must be positive
    if any(l <= 0 for l in obj.lattice):
        issues.append("Lattice constants must be positive")

    # 2. Must have at least one atom
    if not obj.species:
        issues.append("Structure must have at least one atom")

    # 3. Species and coords match (redundant with codec but good for object invariant)
    if len(obj.species) != len(obj.coords):
        issues.append("Species and coords count mismatch")

    return issues
