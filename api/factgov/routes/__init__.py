from fastapi import APIRouter
from .vendors import router as vendors_router
from .rfps import router as rfps_router
from .contracts import router as contracts_router
from .auditpacks import router as auditpacks_router

router = APIRouter()

router.include_router(vendors_router, prefix="/vendors", tags=["Vendors"])
router.include_router(rfps_router, prefix="/rfps", tags=["RFPs"])
router.include_router(contracts_router, prefix="/contracts", tags=["Contracts"])
router.include_router(auditpacks_router, prefix="/auditpacks", tags=["Audit"])
