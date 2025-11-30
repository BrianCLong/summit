from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from .graph.neo4j_client import InMemoryGraph, Neo4jGraph
from .routers import audit, auth, entities, gateway, health, ingest, search
from .services.provenance import InMemoryProvenanceStore, PostgresProvenanceStore
from .settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.use_in_memory_graph:
        app.state.graph = InMemoryGraph()
    else:
        app.state.graph = Neo4jGraph(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password)
        app.state.graph.setup_constraints()
    if settings.postgres_dsn:
        try:
            app.state.provenance_store = PostgresProvenanceStore(settings.postgres_dsn)
        except RuntimeError:
            app.state.provenance_store = InMemoryProvenanceStore()
    else:
        app.state.provenance_store = InMemoryProvenanceStore()
    yield
    graph = app.state.graph
    if isinstance(graph, Neo4jGraph):
        graph.close()
    provenance_store = getattr(app.state, "provenance_store", None)
    if provenance_store and hasattr(provenance_store, "close"):
        provenance_store.close()


app = FastAPI(lifespan=lifespan)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(ingest.router)
app.include_router(entities.router)
app.include_router(search.router)
app.include_router(gateway.router)
app.include_router(audit.router)
