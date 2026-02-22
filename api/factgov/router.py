from typing import List

from fastapi import APIRouter, Depends, HTTPException

from api.factgov.models import (
    Contract,
    ContractInitiateRequest,
    RFPMatchRequest,
    Vendor,
    VendorCreate,
    VendorMatch,
)
from api.factgov.service import FactGovService, factgov_service

router = APIRouter(prefix="/api/factgov", tags=["FactGov"])

@router.post("/vendors", response_model=Vendor)
async def create_vendor(vendor: VendorCreate):
    """Register a new vendor."""
    return await factgov_service.register_vendor(vendor)

@router.get("/vendors/search", response_model=list[Vendor])
async def search_vendors(query: str):
    """Search for vendors by name or product."""
    return await factgov_service.search_vendors(query)

@router.post("/rfps/match", response_model=list[VendorMatch])
async def match_rfp(request: RFPMatchRequest):
    """Match RFP text to vendors."""
    return await factgov_service.match_rfp(request.rfp_text, request.agency_id)

@router.post("/contracts/initiate", response_model=Contract)
async def initiate_contract(request: ContractInitiateRequest):
    """Initiate a procurement contract."""
    return await factgov_service.initiate_contract(request)
