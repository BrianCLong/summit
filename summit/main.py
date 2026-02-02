from fastapi import FastAPI
from summit.api.factflow.router import router as factflow_router
from summit.api.factlaw.router import router as factlaw_router
from summit.api.factmarkets.router import router as factmarkets_router
from summit.api.factgov.router import router as factgov_router

app = FastAPI(title="Summit Multi-Product API")

# Include all product routers
app.include_router(factflow_router)
app.include_router(factlaw_router)
app.include_router(factmarkets_router)
app.include_router(factgov_router)

@app.get("/")
async def root():
    return {
        "products": [
            "factflow",
            "factlaw",
            "factmarkets",
            "factapi",
            "factcert",
            "factdatasets",
            "factgov"
        ]
    }
