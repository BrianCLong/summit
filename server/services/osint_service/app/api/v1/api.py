from fastapi import APIRouter

from .endpoints import analysis, collectors, entities, reports, scans

api_router = APIRouter()
api_router.include_router(scans.router, prefix="/scans", tags=["scans"])
api_router.include_router(entities.router, prefix="/entities", tags=["entities"])
api_router.include_router(collectors.router, prefix="/collectors", tags=["collectors"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
