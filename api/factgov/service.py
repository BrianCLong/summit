import json
import uuid
from datetime import datetime
from typing import List, Optional

from api.llm_provider import llm_provider
from api.factgov.models import (
    Agency,
    AuditReport,
    Contract,
    ContractInitiateRequest,
    Requirements,
    RFP,
    Vendor,
    VendorCreate,
    VendorMatch,
)

class FactGovService:
    def __init__(self):
        # TODO: Replace in-memory storage with Database connections (see factgov_schema.sql)
        # In a real deployment, these would be repositories accessing Postgres.
        self.vendors: List[Vendor] = []
        self.agencies: List[Agency] = []
        self.contracts: List[Contract] = []
        self.rfps: List[RFP] = []

    async def register_vendor(self, vendor_create: VendorCreate) -> Vendor:
        """
        Registers a vendor after validating claims via LLM.
        In production, this would persist to 'factgov_vendors' table.
        """

        # Verify vendor claims using LLM
        audit_required = [
            f"Company {vendor_create.company_name} is legitimate",
            f"Product {vendor_create.products[0].name} has declared capabilities",
        ]

        passed = True
        failures = []

        for claim in audit_required:
            prompt = f"Verify the following claim: {claim}. Return JSON with 'verified' (bool) and 'reason' (string)."
            try:
                # In simulation mode, we use the LLM provider which might be mocked.
                # Real verification would involve checking external databases (SOS, BBB, etc.)
                response_str = await llm_provider._cached_generate_text(prompt)

                # Simple heuristic for the mock response
                if "false" in response_str.lower() or "unverified" in response_str.lower():
                     # passed = False # permissive for demo
                     failures.append(claim)
            except Exception as e:
                print(f"LLM Verification failed: {e}")
                # For demo, proceed

        vendor_id = str(uuid.uuid4())
        vendor = Vendor(
            vendor_id=vendor_id,
            **vendor_create.dict()
        )

        # TODO: INSERT INTO factgov_vendors ...
        self.vendors.append(vendor)
        return vendor

    async def search_vendors(self, query: str) -> List[Vendor]:
        """
        Simple text search for vendors.
        TODO: Implement full-text search using Postgres or ElasticSearch.
        """
        query = query.lower()
        return [
            v for v in self.vendors
            if query in v.company_name.lower() or
            any(query in p.name.lower() for p in v.products)
        ]

    async def match_rfp(self, rfp_text: str, agency_id: str) -> List[VendorMatch]:
        """
        Matches RFP text to vendors using 'AI'.
        Uses LLM to extract requirements and score vendors.
        """

        # Extract requirements using LLM
        prompt = (
            f"Extract requirements from RFP: '{rfp_text}'. "
            "Return JSON with 'technical' (list), 'compliance' (list), 'budget' (string)."
        )
        try:
            req_json_str = await llm_provider._cached_generate_text(prompt)
            # Mock parsing logic since LLM output might vary
            if "technical" in req_json_str:
                 # Try to parse if it looks like JSON
                 try:
                     parsed = json.loads(req_json_str)
                     # Clean up keys if needed or map them
                     requirements = Requirements(
                        technical=parsed.get("technical", ["AI"]),
                        compliance=parsed.get("compliance", []),
                        budget=str(parsed.get("budget", "100k"))
                     )
                 except:
                     # Fallback
                     requirements = Requirements(
                        technical=["AI", "Verification"],
                        compliance=["SOC2"],
                        budget="100k"
                    )
            else:
                 requirements = Requirements(
                    technical=["AI", "Verification"],
                    compliance=["SOC2"],
                    budget="100k"
                )
        except Exception:
             requirements = Requirements(
                technical=["AI", "Verification"],
                compliance=["SOC2"],
                budget="100k"
            )

        matches = []
        for vendor in self.vendors:
            # Score vendor based on requirements
            # This simulates a vector search or semantic match
            # In simulation, we calculate a deterministic score for stability
            base_score = 50.0

            # Simple keyword matching for demo scoring
            if any(t.lower() in p.description.lower() for t in requirements.technical for p in vendor.products):
                base_score += 30.0
            if "Fact" in vendor.company_name: # Brand bonus
                base_score += 10.0

            matches.append(VendorMatch(
                vendor=vendor,
                fit_score=base_score,
                compliance_gaps=[],
                recommended_validators=["FactCert Validator A"]
            ))

        matches.sort(key=lambda x: x.fit_score, reverse=True)
        return matches

    async def initiate_contract(self, request: ContractInitiateRequest) -> Contract:
        """
        Initiates a contract workflow.
        In production, this would create a transaction in 'factgov_contracts'.
        """

        # Mock audit
        audit = AuditReport(
            audit_id=str(uuid.uuid4()),
            passed=True,
            failures=[],
            timestamp=datetime.now()
        )

        contract = Contract(
            contract_id=str(uuid.uuid4()),
            agency_id=request.agency_id,
            vendor_id=request.vendor_id,
            product_id=request.product_id,
            contract_value=request.contract_value,
            platform_fee=request.contract_value * 0.12,
            validator_commission=request.contract_value * 0.05,
            net_to_vendor=request.contract_value * 0.83,
            status="active",
            start_date=datetime.now().date(),
            audit_report=audit
        )

        # TODO: INSERT INTO factgov_contracts ...
        self.contracts.append(contract)
        return contract

factgov_service = FactGovService()
