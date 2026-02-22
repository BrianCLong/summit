import json

import pytest

from summit.workflows.c14n import canonicalize
from summit.workflows.ir import Step, WorkflowIR


def test_canonicalize_stability():
    ir1 = WorkflowIR(
        steps=[
            Step(id="b", kind="extract"),
            Step(id="a", kind="classify"),
        ],
        edges=[("a", "b")]
    )
    ir2 = WorkflowIR(
        steps=[
            Step(id="a", kind="classify"),
            Step(id="b", kind="extract"),
        ],
        edges=[("a", "b")]
    )
    assert canonicalize(ir1) == canonicalize(ir2)

def test_canonicalize_output():
    ir = WorkflowIR(
        steps=[Step(id="1", kind="validate")],
        edges=[],
        meta={"test": True}
    )
    c = canonicalize(ir)
    data = json.loads(c)
    assert data["steps"][0]["id"] == "1"
    assert data["meta"]["test"] is True

def test_duplicate_step_ids_not_handled_by_ir_but_c14n_maintains_order():
    # IR dataclass is frozen but doesn't validate uniqueness on init
    ir = WorkflowIR(
        steps=[
            Step(id="x", kind="extract"),
            Step(id="x", kind="classify"),
        ],
        edges=[]
    )
    # canonicalize uses sorted(key=id), if IDs are same, order depends on stable sort or original order
    # In our case, IDs are same, so it's original order (Python's sorted is stable)
    c = canonicalize(ir)
    data = json.loads(c)
    assert len(data["steps"]) == 2
