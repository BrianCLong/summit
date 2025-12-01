from fastapi import FastAPI
from contextlib import asynccontextmanager
from .services import update_feeds, DB
from .attack_surface_mock_data import mock_assets
from .deep_web_mock_data import mock_deep_web_findings

# In a more advanced application, this would be a sophisticated background task runner like Celery.
# For the MVP, we'll just update the feeds on startup.
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML model
    print("Application startup...")
    update_feeds()
    yield
    # Clean up the ML model and release the resources
    print("Application shutdown...")


app = FastAPI(
    title="SummitThreat",
    description="An open-source threat intelligence platform.",
    version="0.1.0",
    lifespan=lifespan
)

@app.get("/")
def read_root():
    return {"message": "Welcome to SummitThreat"}

# Placeholder for the IOCs endpoint
@app.get("/api/v1/iocs")
def get_iocs():
    return {"iocs": DB["iocs"]}

# Placeholder for the Attack Surface Emulator endpoint
@app.get("/api/v1/attack-surface")
def get_attack_surface():
    return {"assets": mock_assets}

# Placeholder for the Deep Web Hunter endpoint
@app.get("/api/v1/deep-web")
def get_deep_web_findings():
    return {"findings": mock_deep_web_findings}
