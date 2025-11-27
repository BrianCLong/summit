from fastapi import APIRouter, Depends, Request

from ..deps import get_tenant_case, require_clearance
from ..services.policy import has_clearance

router = APIRouter()


@router.get("/entities/search")
def search(
    q: str,
    request: Request,
    tc=Depends(get_tenant_case),
    user=Depends(require_clearance("analyst")),
):
    graph = request.app.state.graph
    raw_results = graph.search_entities(q, tc["tenant_id"], tc["case_id"])
    results = []
    for entry in raw_results:
        policy = entry.get("policy") or entry.get("properties", {}).get("policy")
        if policy and not has_clearance(policy, user.clearances):
            continue
        results.append({"id": entry.get("id"), "type": entry.get("type"), "label": entry.get("name", "")})
    return {"results": results}


@router.get("/views/tripane")
def tripane(
    entity_id: str,
    request: Request,
    tc=Depends(get_tenant_case),
    user=Depends(require_clearance("analyst")),
):
    graph = request.app.state.graph
    entity = graph.entity_by_id(entity_id) if hasattr(graph, "entity_by_id") else None
    if not entity:
        entity = graph.node_by_id(entity_id) if hasattr(graph, "node_by_id") else None
    if not entity:
        return {"timeline": [], "map": [], "graph": {"nodes": [], "edges": []}}

    neighbor_graph = graph.neighbors(entity_id, max_hops=2, labels=["Event", "Location", "Org", "Person", "Document"])
    nodes = neighbor_graph.get("nodes", [])
    edges = neighbor_graph.get("edges", [])

    timeline = []
    map_points = []
    graph_nodes = []
    for node in nodes:
        graph_nodes.append({"id": node.get("id"), "label": node.get("name", ""), "type": node.get("type")})
        props = node.get("properties", {}) or {}
        if node.get("type") == "Event" and props.get("occurred_at"):
            timeline.append(
                {"id": node.get("id"), "occurred_at": str(props.get("occurred_at")), "label": node.get("name", "")}
            )
        if node.get("type") == "Location" and props.get("lat") is not None and props.get("lon") is not None:
            map_points.append(
                {"id": node.get("id"), "lat": props.get("lat"), "lon": props.get("lon"), "label": node.get("name", "")}
            )

    graph_edges = [
        {"source": e.get("source"), "target": e.get("target"), "type": e.get("type")}
        for e in edges
    ]

    return {
        "timeline": timeline,
        "map": map_points,
        "graph": {"nodes": graph_nodes, "edges": graph_edges},
    }
