from fastapi import FastAPI

from server.services.osint_service.app.api.v1 import api_router
from server.services.osint_service.app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json")

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def read_root():
    return {"message": "Welcome to SummitOSINT"}
