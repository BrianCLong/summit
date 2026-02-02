import json
from datetime import date
from typing import List, Optional
from uuid import UUID, uuid4

from api.llm_provider import llm_provider
from api.factgov.models import (
    Contract,
    Product,
    RFP,
    Vendor,
    VendorCreate,
    VendorMatch,
)

# In-memory storage for demonstration
VENDORS_DB: List[Vendor] = []
CONTRACTS_DB: List[Contract] = []


class FactGovService:
    async def register_vendor(self, vendor_create: VendorCreate) -> Vendor:
        """
        Registers a vendor after verifying claims.
        """
        # Audit simulation
        audit_claims = [
            f"Company {vendor_create.company_name} is SOC2 certified",
            f"Product {vendor_create.products[0].name} has 99.9% uptime" if vendor_create.products else "Product has uptime",
        ]

        for claim in audit_claims:
            # Mock verification call
            # In a real system, this would call the verification API
            prompt = f"Verify claim: {claim}. Return JSON with 'verified' (bool)."
            try:
                response = await llm_provider.generate_text(prompt)
                # For simulation, we assume success if LLM returns
                pass
            except Exception as e:
                print(f"Verification failed: {e}")

        vendor = Vendor(
            vendor_id=uuid4(),
            company_name=vendor_create.company_name,
            products=vendor_create.products,
            certifications=vendor_create.certifications,
            cooperative_memberships=vendor_create.cooperative_memberships,
            compliance_docs=vendor_create.compliance_docs,
            performance_score=0.0 # Initial score
        )
        VENDORS_DB.append(vendor)
        return vendor

    async def search_vendors(self, query: str, category: Optional[str] = None) -> List[Vendor]:
        """
        Searches for vendors.
        """
        results = []
        for v in VENDORS_DB:
            match = False
            if query.lower() in v.company_name.lower():
                match = True
            for p in v.products:
                if query.lower() in p.name.lower() or query.lower() in p.description.lower():
                    match = True
                if category and p.category.lower() == category.lower():
                    match = match and True
                elif category:
                    match = False

            if match:
                results.append(v)
        return results

    async def match_rfp(self, rfp_description: str, budget: float, agency_id: UUID) -> List[VendorMatch]:
        """
        Matches an RFP to vendors using 'NLP'.
        """
        # Use LLM to extract requirements
        prompt = (
            f"Extract requirements from RFP: {rfp_description}. "
            "Return JSON list of keywords."
        )
        try:
            # Mock extraction
            # response = await llm_provider.generate_text(prompt)
            keywords = rfp_description.split() # Simple mock
        except Exception:
            keywords = []

        matches = []
        for vendor in VENDORS_DB:
            score = 0.0
            # Simple keyword matching logic
            for p in vendor.products:
                for word in keywords:
                    if word.lower() in p.description.lower():
                        score += 10

            # Normalize score
            fit_score = min(100.0, score)

            if fit_score > 0:
                matches.append(VendorMatch(
                    vendor=vendor,
                    fit_score=fit_score,
                    compliance_gaps=[], # Mock
                    recommended_validators=["FactCert Validator A"] # Mock
                ))

        return sorted(matches, key=lambda x: x.fit_score, reverse=True)

    async def initiate_contract(self, agency_id: UUID, vendor_id: UUID, product_id: str, contract_value: float) -> Contract:
        """
        Initiates a contract with revenue splitting.
        """
        # Verify vendor exists
        vendor = next((v for v in VENDORS_DB if v.vendor_id == vendor_id), None)
        if not vendor:
             raise ValueError("Vendor not found")

        # Revenue Logic
        platform_fee = contract_value * 0.12
        validator_commission = contract_value * 0.05
        net_to_vendor = contract_value * 0.83

        contract = Contract(
            contract_id=uuid4(),
            agency_id=agency_id,
            vendor_id=vendor_id,
            product_id=product_id,
            contract_value=contract_value,
            platform_fee=platform_fee,
            validator_commission=validator_commission,
            net_to_vendor=net_to_vendor,
            status="active",
            start_date=date.today()
        )
        CONTRACTS_DB.append(contract)

        # In a real system, trigger Stripe payment here

        return contract

fact_gov_service = FactGovService()
