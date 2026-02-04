import json
import pytest
from pathlib import Path
from summit.geometry.vgt import compute_local_dimensions

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures" / "pointclouds"

def load_fixture(name):
    with open(FIXTURES_DIR / name) as f:
        return json.load(f)

def test_vgt_line_dimension():
    points = load_fixture("line.json")
    # k1=4, k2=8
    dims = compute_local_dimensions(points, k1=4, k2=8)

    # Filter out 0.0 (boundary effects or degeneracies)
    valid_dims = [d for d in dims if d > 0.1]
    assert valid_dims

    sorted_dims = sorted(valid_dims)
    median_dim = sorted_dims[len(valid_dims)//2]

    print(f"Line median dim: {median_dim}")
    assert 0.8 < median_dim < 1.2

def test_vgt_plane_dimension():
    points = load_fixture("plane.json")
    dims = compute_local_dimensions(points, k1=4, k2=8)

    valid_dims = [d for d in dims if d > 0.1]
    assert valid_dims

    sorted_dims = sorted(valid_dims)
    median_dim = sorted_dims[len(valid_dims)//2]

    print(f"Plane median dim: {median_dim}")
    assert 1.6 < median_dim < 2.4

def test_determinism():
    points = load_fixture("plane.json")
    dims1 = compute_local_dimensions(points)
    dims2 = compute_local_dimensions(points)
    assert dims1 == dims2
