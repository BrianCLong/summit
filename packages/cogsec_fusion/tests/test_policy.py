import pytest
from cogsec_fusion.policy.norm_nodes import get_active_norms
import yaml

def test_norms_loaded():
    norms = get_active_norms()
    assert len(norms) >= 2
    assert any(n["id"] == "NORM-ICRC-COGWAR-2026" for n in norms)

def test_constraints_loaded():
    with open("packages/cogsec_fusion/src/cogsec_fusion/policy/constraints.yaml", 'r') as f:
        data = yaml.safe_load(f)

    constraints = data["constraints"]
    assert len(constraints) > 0
    assert any(c["id"] == "POLICY-NO-OFFENSIVE-IO" for c in constraints)
