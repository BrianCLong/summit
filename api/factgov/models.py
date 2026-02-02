from datetime import date, datetime
from typing import Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Certification(BaseModel):
    cert_id: str
    name: str
    issued_by: str
    date_issued: date
    expiry_date: Optional[date] = None


class Product(BaseModel):
    product_id: str
    name: str
    category: str
    description: str
    use_cases: List[str]
    integrations: List[str]


class PricingModel(BaseModel):
    model_type: str  # "subscription", "usage", "fixed"
    details: Dict[str, float]


class Vendor(BaseModel):
    vendor_id: UUID = Field(default_factory=uuid4)
    company_name: str
    products: List[Product]
    certifications: List[Certification]
    cooperative_memberships: List[str]
    compliance_docs: Dict[str, str]
    pricing: Optional[PricingModel] = None
    performance_score: float = 0.0


class Agency(BaseModel):
    agency_id: UUID = Field(default_factory=uuid4)
    name: str
    agency_type: str
    jurisdiction: str
    budget_authority: float


class VendorMatch(BaseModel):
    vendor: Vendor
    fit_score: float
    compliance_gaps: List[str]
    recommended_validators: List[str]


class RFP(BaseModel):
    rfp_id: UUID = Field(default_factory=uuid4)
    agency_id: UUID
    title: str
    description: str
    budget: float
    deadline: date
    requirements: Optional[Dict] = None


class Contract(BaseModel):
    contract_id: UUID = Field(default_factory=uuid4)
    agency_id: UUID
    vendor_id: UUID
    product_id: str
    contract_value: float
    platform_fee: float
    validator_commission: float
    net_to_vendor: float
    status: str
    start_date: date
    audit_report_id: Optional[UUID] = None


# --- Request/Response Models ---

class VendorCreate(BaseModel):
    company_name: str
    products: List[Product]
    certifications: List[Certification] = []
    cooperative_memberships: List[str] = []
    compliance_docs: Dict[str, str] = {}


class RFPMatchRequest(BaseModel):
    rfp_description: str
    budget: Optional[float] = None
    agency_id: UUID


class ContractInitiateRequest(BaseModel):
    agency_id: UUID
    vendor_id: UUID
    product_id: str
    contract_value: float
