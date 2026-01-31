import json

from .ir import WorkflowIR


def canonicalize(ir: WorkflowIR) -> str:
    obj = {
        "steps": sorted(
            [{"id": s.id, "kind": s.kind, "config": s.config} for s in ir.steps],
            key=lambda x: x["id"]
        ),
        "edges": sorted([[a, b] for (a, b) in ir.edges]),
        "meta": ir.meta,
    }
    return json.dumps(obj, sort_keys=True, separators=(",", ":"))
