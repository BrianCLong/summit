from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from api.factgov.models import (
    Contract,
    ContractInitiateRequest,
    RFPMatchRequest,
    Vendor,
    VendorCreate,
    VendorMatch,
)
from api.factgov.service import FactGovService, fact_gov_service

router = APIRouter(prefix="/api/factgov", tags=["FactGov"])


@router.post("/vendors", response_model=Vendor)
async def create_vendor(
    vendor: VendorCreate,
    service: FactGovService = Depends(lambda: fact_gov_service)
):
    """
    Vendor self-registration.
    """
    try:
        return await service.register_vendor(vendor)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/vendors/search", response_model=List[Vendor])
async def search_vendors(
    query: str,
    category: Optional[str] = None,
    service: FactGovService = Depends(lambda: fact_gov_service)
):
    """
    Search for vendors by query and optional category.
    """
    return await service.search_vendors(query, category)


@router.post("/rfps/match", response_model=List[VendorMatch])
async def match_rfp(
    request: RFPMatchRequest,
    service: FactGovService = Depends(lambda: fact_gov_service)
):
    """
    Match RFP description to qualified vendors.
    """
    return await service.match_rfp(
        request.rfp_description,
        request.budget or 0.0,
        request.agency_id
    )


@router.post("/contracts/initiate", response_model=Contract)
async def initiate_contract(
    request: ContractInitiateRequest,
    service: FactGovService = Depends(lambda: fact_gov_service)
):
    """
    Initiate a procurement contract.
    """
    try:
        return await service.initiate_contract(
            request.agency_id,
            request.vendor_id,
            request.product_id,
            request.contract_value
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
