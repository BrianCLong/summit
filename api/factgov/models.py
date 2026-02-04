from datetime import date, datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

class PricingModel(BaseModel):
    model_type: str  # "subscription", "per_api_call", "contract"
    base_price: float
    currency: str = "USD"

class Certification(BaseModel):
    name: str
    issuer: str
    date_issued: date
    valid_until: Optional[date] = None

class Product(BaseModel):
    product_id: str
    name: str
    category: str
    description: str
    use_cases: List[str]
    integrations: List[str]

class Vendor(BaseModel):
    vendor_id: str
    company_name: str
    products: List[Product]
    certifications: List[Certification]
    cooperative_memberships: List[str]
    compliance_docs: Dict[str, str]
    pricing: PricingModel
    performance_score: float = 0.0

class VendorCreate(BaseModel):
    company_name: str
    products: List[Product]
    certifications: List[Certification] = []
    cooperative_memberships: List[str] = []
    compliance_docs: Dict[str, str] = {}
    pricing: PricingModel

class Agency(BaseModel):
    agency_id: str
    name: str
    agency_type: str
    jurisdiction: str
    budget_authority: Optional[float] = None
    procurement_officer_email: str

class AuditReport(BaseModel):
    audit_id: str
    passed: bool
    failures: List[str]
    timestamp: datetime

class Contract(BaseModel):
    contract_id: str
    agency_id: str
    vendor_id: str
    product_id: str
    contract_value: float
    platform_fee: float
    validator_commission: float
    net_to_vendor: float
    status: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    audit_report: Optional[AuditReport] = None

class ContractInitiateRequest(BaseModel):
    agency_id: str
    vendor_id: str
    product_id: str
    contract_value: float

class Requirements(BaseModel):
    technical: List[str]
    compliance: List[str]
    budget: Optional[str] = None

class RFP(BaseModel):
    rfp_id: str
    agency_id: str
    title: str
    description: str
    requirements: Optional[Requirements] = None
    budget: Optional[float] = None
    deadline: Optional[date] = None
    status: str = "open"

class VendorMatch(BaseModel):
    vendor: Vendor
    fit_score: float
    compliance_gaps: List[str]
    recommended_validators: List[str]

class RFPMatchRequest(BaseModel):
    rfp_text: str
    agency_id: str
