from __future__ import annotations

import json
from typing import List

from fastapi import APIRouter, Depends

from .audit import log_audit
from .config import get_settings
from .ethics import check_request
from .schemas import ExplainRequest, ExplainResponse, Importance, PathExplanation
from .security import check_api_key, require_role, enforce_limits
from .utils.graph_io import to_networkx
from .explain import saliency, paths as path_mod, counterfactuals, robustness, fairness, viz_payload

router = APIRouter()
settings = get_settings()


@router.get("/healthz")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/readyz")
async def ready() -> dict:
    return {"status": "ready"}


@router.get("/metrics")
async def metrics():  # pragma: no cover
    from prometheus_client import generate_latest

    return generate_latest()


@router.post("/explain", response_model=ExplainResponse)
async def explain(
    req: ExplainRequest,
    _: None = Depends(check_api_key),
    __: None = Depends(require_role("analyst")),
) -> ExplainResponse:
    enforce_limits(req)
    check_request(json.dumps(req.options or {}))
    output = req.outputs[0]
    g = to_networkx(req.subgraph)
    edge_imp = saliency.edge_importance(g, output)
    node_imp = saliency.node_importance(g, output)
    src = output.target.get("src", "")
    dst = output.target.get("dst", "")
    path_list = [PathExplanation(**p) for p in path_mod.top_paths(g, src, dst)]
    cf_list = counterfactuals.find_counterfactual(g, output)
    robust = robustness.assess(g, output)
    fair = fairness.check(g, output)
    viz = viz_payload.build_viz(g, node_imp, edge_imp)

    importances: List[Importance] = [
        *[Importance(id=k, type="node", score=v) for k, v in node_imp.items()],
        *[Importance(id=k, type="edge", score=v) for k, v in edge_imp.items()],
    ]
    audit_id = log_audit("explain", req.model_dump(), "ok")
    return ExplainResponse(
        importances=importances,
        paths=path_list,
        counterfactuals=cf_list,
        robustness=robust,
        fairness=fair,
        viz=viz,
        audit_id=audit_id,
    )
