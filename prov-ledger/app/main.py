from fastapi import FastAPI

from .api import router
from .config import log_config, settings
from .observability import logging_middleware

log_config()
app = FastAPI(title="Provenance Ledger")
app.middleware("http")(logging_middleware)
app.include_router(router)

if settings.ENABLE_GRAPHQL:
    try:
        from strawberry.fastapi import GraphQLRouter

        from .graphql import schema

        graphql_app = GraphQLRouter(schema)
        app.include_router(graphql_app, prefix="/graphql")
    except ImportError:
        import logging

        logging.getLogger(__name__).error(
            "ENABLE_GRAPHQL is True but strawberry-graphql is not installed."
        )


@app.on_event("startup")
async def startup_event():
    if settings.ENABLE_GRPC:
        try:
            from grpclib.server import Server

            from .grpc_server import ProvenanceService

            app.state.grpc_server = Server([ProvenanceService()])
            await app.state.grpc_server.start("0.0.0.0", 50051)
            import logging

            logging.getLogger(__name__).info("gRPC server started on 0.0.0.0:50051")
        except Exception as e:
            import logging

            logging.getLogger(__name__).error(f"Failed to start gRPC server: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    if hasattr(app.state, "grpc_server"):
        app.state.grpc_server.close()
