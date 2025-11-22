"""Maestro FastAPI application."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI

from api.maestro import router as maestro_router
from maestro.storage import MaestroStore


def create_maestro_app() -> FastAPI:
    """Create and configure the Maestro FastAPI application."""
    app = FastAPI(
        title="Maestro Conductor API",
        description="Run, Artifact, and Disclosure Pack tracking for IntelGraph",
        version="0.1.0",
    )

    # Initialize storage
    app.state.maestro_store = MaestroStore()

    # Include routers
    app.include_router(maestro_router)

    # Health check
    @app.get("/health")
    def health():
        return {"status": "ok", "service": "maestro"}

    return app


# Application instance for uvicorn
app = create_maestro_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
