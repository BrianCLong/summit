from fastapi import APIRouter, Request, Response, status

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/health/detailed")
def health_detailed(request: Request, response: Response) -> dict:
    graph = getattr(request.app.state, "graph", None)
    prov = getattr(request.app.state, "provenance_store", None)

    services = {"neo4j": "unknown", "postgres": "unknown"}

    # Check Graph
    if graph:
        if hasattr(graph, "health_check"):
            if graph.health_check():
                services["neo4j"] = "healthy"
            else:
                services["neo4j"] = "unhealthy"
        else:
            # Assuming InMemoryGraph or other impl without explicit check is healthy if instantiated
            services["neo4j"] = "healthy"

    # Check Provenance
    if prov:
        if hasattr(prov, "health_check"):
            if prov.health_check():
                services["postgres"] = "healthy"
            else:
                services["postgres"] = "unhealthy"
        else:
            # Assuming InMemoryProvenanceStore is healthy
            services["postgres"] = "healthy"

    overall_status = "ok"
    if services["neo4j"] == "unhealthy" or services["postgres"] == "unhealthy":
        overall_status = "unhealthy"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {"status": overall_status, "services": services}
