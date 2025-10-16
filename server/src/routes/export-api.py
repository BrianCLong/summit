"""
FastAPI stub endpoints for export policy evaluation
Alternative to the Express/TypeScript implementation
"""

import hashlib
import logging
import time
import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Literal

from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="IntelGraph Export API",
    description="Policy-aware export service with provenance tracking",
    version="1.0.0",
)

logger = logging.getLogger(__name__)


# Enums
class ExportType(str, Enum):
    analysis = "analysis"
    report = "report"
    dataset = "dataset"
    api = "api"


class UserRole(str, Enum):
    analyst = "analyst"
    investigator = "investigator"
    admin = "admin"
    compliance_officer = "compliance-officer"


class Purpose(str, Enum):
    investigation = "investigation"
    threat_intel = "threat-intel"
    fraud_risk = "fraud-risk"
    commercial = "commercial"
    research = "research"


class Classification(str, Enum):
    public = "public"
    internal = "internal"
    confidential = "confidential"
    restricted = "restricted"


class DecisionEffect(str, Enum):
    allow = "allow"
    deny = "deny"
    review = "review"


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Severity(str, Enum):
    blocking = "blocking"
    warning = "warning"


# Request models
class SourceField(BaseModel):
    name: str
    type: str


class DataSource(BaseModel):
    id: str
    license: str
    owner: str | None = None
    classification: Classification | None = None
    fields: list[SourceField] | None = None
    pii_detected: bool | None = False


class Dataset(BaseModel):
    sources: list[DataSource]


class ExportContext(BaseModel):
    user_id: str
    user_role: UserRole
    user_scopes: list[str] | None = []
    tenant_id: str
    purpose: Purpose
    export_type: ExportType
    destination: str | None = None
    approvals: list[str] | None = []
    step_up_verified: bool | None = False
    pii_export_approved: bool | None = False


class ExportRequest(BaseModel):
    action: Literal["export"] = "export"
    dataset: Dataset
    context: ExportContext
    case_id: str | None = None
    claim_ids: list[str] | None = []


class WhatIfScenario(BaseModel):
    name: str
    changes: dict[str, Any]


class Simulation(BaseModel):
    policy_changes: dict[str, Any] | None = {}
    what_if_scenarios: list[WhatIfScenario] | None = []


class SimulateRequest(ExportRequest):
    simulation: Simulation


# Response models
class Violation(BaseModel):
    code: str
    message: str
    appeal_code: str
    appeal_url: str
    severity: Severity


class RiskAssessment(BaseModel):
    level: RiskLevel
    factors: list[str]
    requires_approval: bool
    requires_step_up: bool


class Redaction(BaseModel):
    field: str
    reason: str
    replacement: str


class AuditTrail(BaseModel):
    decision_id: str
    timestamp: str
    policy_version: str
    evaluator: str


class Decision(BaseModel):
    effect: DecisionEffect
    reasons: list[str]
    violations: list[Violation]
    risk_assessment: RiskAssessment
    redactions: list[Redaction]
    audit_trail: AuditTrail


class CostEstimate(BaseModel):
    estimated_cost: float
    budget_remaining: float
    budget_utilization: float


class ExportResponse(BaseModel):
    decision: Decision
    export_url: str | None = None
    manifest_url: str | None = None
    bundle_hash: str | None = None
    cost_estimate: CostEstimate


class ImpactAnalysis(BaseModel):
    decision_changed: bool
    violations_added: list[str]
    violations_removed: list[str]
    risk_level_change: str


class ScenarioResult(BaseModel):
    name: str
    decision: Decision
    impact: ImpactAnalysis


class SimulationResults(BaseModel):
    baseline: Decision
    scenarios: list[ScenarioResult]


class SimulationResponse(ExportResponse):
    simulation_results: SimulationResults


class ExportStatus(BaseModel):
    request_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    created_at: str
    completed_at: str | None = None
    export_url: str | None = None
    manifest_url: str | None = None
    bundle_size_bytes: int | None = None
    expiry_date: str | None = None
    error_message: str | None = None


# Policy evaluation logic
class PolicyEvaluator:
    """Mock policy evaluation logic"""

    @staticmethod
    def evaluate_export_policy(request: ExportRequest) -> Decision:
        """Evaluate export request against policies"""
        violations = []
        risk_factors = []
        requires_approval = False
        requires_step_up = False

        # Check license restrictions
        for source in request.dataset.sources:
            if (
                source.license in ["GPL-3.0", "AGPL-3.0"]
                and request.context.purpose == Purpose.commercial
            ):
                violations.append(
                    Violation(
                        code="COMMERCIAL_USE_VIOLATION",
                        message=f"Commercial use not permitted for license {source.license}",
                        appeal_code="COM001",
                        appeal_url="https://compliance.intelgraph.io/appeal/COM001",
                        severity=Severity.blocking,
                    )
                )

            if source.license in ["DISALLOW_EXPORT", "VIEW_ONLY", "EMBARGOED"]:
                violations.append(
                    Violation(
                        code="LICENSE_VIOLATION",
                        message=f"Export blocked by license {source.license}",
                        appeal_code="LIC001",
                        appeal_url="https://compliance.intelgraph.io/appeal/LIC001",
                        severity=Severity.blocking,
                    )
                )

        # Check PII requirements
        pii_sources = [s for s in request.dataset.sources if s.pii_detected]
        if pii_sources and not request.context.pii_export_approved:
            violations.append(
                Violation(
                    code="PII_EXPORT_WITHOUT_APPROVAL",
                    message="PII data export requires explicit approval",
                    appeal_code="PII001",
                    appeal_url="https://compliance.intelgraph.io/appeal/PII001",
                    severity=Severity.blocking,
                )
            )
            risk_factors.append("Contains PII data without approval")

        # Check classification requirements
        restricted_sources = [
            s for s in request.dataset.sources if s.classification == Classification.restricted
        ]
        if restricted_sources:
            requires_step_up = True
            if not request.context.step_up_verified:
                violations.append(
                    Violation(
                        code="STEP_UP_REQUIRED",
                        message="Step-up authentication required for restricted data",
                        appeal_code="AUTH002",
                        appeal_url="https://compliance.intelgraph.io/appeal/AUTH002",
                        severity=Severity.blocking,
                    )
                )

        # Check export type restrictions
        if request.context.export_type == ExportType.dataset:
            requires_approval = True
            risk_factors.append("Dataset export requires review")

            if "compliance-officer" not in (request.context.approvals or []):
                violations.append(
                    Violation(
                        code="APPROVAL_REQUIRED",
                        message="Compliance officer approval required for dataset export",
                        appeal_code="APP001",
                        appeal_url="https://compliance.intelgraph.io/appeal/APP001",
                        severity=Severity.blocking,
                    )
                )

        # Determine risk level
        if len([v for v in violations if v.severity == Severity.blocking]) > 0:
            risk_level = RiskLevel.high
        elif requires_approval or requires_step_up:
            risk_level = RiskLevel.medium
        else:
            risk_level = RiskLevel.low

        # Determine effect
        blocking_violations = [v for v in violations if v.severity == Severity.blocking]
        if blocking_violations:
            effect = DecisionEffect.deny
        elif requires_approval and "compliance-officer" not in (request.context.approvals or []):
            effect = DecisionEffect.review
        else:
            effect = DecisionEffect.allow

        # Generate redactions
        redactions = PolicyEvaluator._generate_redactions(request)

        return Decision(
            effect=effect,
            reasons=[v.message for v in violations],
            violations=violations,
            risk_assessment=RiskAssessment(
                level=risk_level,
                factors=risk_factors,
                requires_approval=requires_approval,
                requires_step_up=requires_step_up,
            ),
            redactions=redactions,
            audit_trail=AuditTrail(
                decision_id=str(uuid.uuid4()),
                timestamp=datetime.utcnow().isoformat(),
                policy_version="export-enhanced-1.0",
                evaluator="fastapi-policy-engine",
            ),
        )

    @staticmethod
    def _generate_redactions(request: ExportRequest) -> list[Redaction]:
        """Generate field redactions based on policy"""
        redactions = []

        for source in request.dataset.sources:
            if source.fields:
                for field in source.fields:
                    if (
                        field.type in ["email", "phone", "ssn"]
                        and not request.context.pii_export_approved
                    ):
                        redactions.append(
                            Redaction(
                                field=field.name,
                                reason="PII field requires explicit approval for export",
                                replacement="[REDACTED]",
                            )
                        )

            if (
                source.classification == Classification.confidential
                and request.context.export_type == ExportType.dataset
            ):
                redactions.append(
                    Redaction(
                        field="source_details",
                        reason="Confidential data not permitted in dataset exports",
                        replacement="[CLASSIFIED]",
                    )
                )

        return redactions


# Cost tracking
class CostTracker:
    """Mock cost tracking"""

    @staticmethod
    def calculate_cost(request: ExportRequest) -> CostEstimate:
        """Calculate export cost estimate"""
        base_cost = 0.01  # $0.01 base cost
        source_multiplier = len(request.dataset.sources) * 0.005

        if request.context.export_type == ExportType.dataset:
            base_cost *= 2  # Dataset exports cost more

        estimated_cost = base_cost + source_multiplier

        # Mock budget values
        budget_remaining = 25.0  # $25 remaining
        budget_utilization = estimated_cost / (budget_remaining + estimated_cost)

        return CostEstimate(
            estimated_cost=round(estimated_cost, 4),
            budget_remaining=budget_remaining,
            budget_utilization=round(budget_utilization, 3),
        )


# Endpoints
@app.post("/export", response_model=ExportResponse)
async def export_data(request: ExportRequest, background_tasks: BackgroundTasks):
    """
    Main export endpoint with full policy evaluation
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())

    logger.info(f"Export request {request_id} received for tenant {request.context.tenant_id}")

    try:
        # Evaluate policy
        decision = PolicyEvaluator.evaluate_export_policy(request)

        # Calculate costs
        cost_estimate = CostTracker.calculate_cost(request)

        # Check if cost exceeds budget
        if cost_estimate.estimated_cost > cost_estimate.budget_remaining:
            decision = Decision(
                effect=DecisionEffect.deny,
                reasons=["Cost limit exceeded"],
                violations=[
                    Violation(
                        code="COST_LIMIT_EXCEEDED",
                        message=f"Export cost ${cost_estimate.estimated_cost} exceeds remaining budget ${cost_estimate.budget_remaining}",
                        appeal_code="COST001",
                        appeal_url="https://compliance.intelgraph.io/appeal/COST001",
                        severity=Severity.blocking,
                    )
                ],
                risk_assessment=RiskAssessment(
                    level=RiskLevel.high,
                    factors=["Budget exceeded"],
                    requires_approval=False,
                    requires_step_up=False,
                ),
                redactions=[],
                audit_trail=AuditTrail(
                    decision_id=request_id,
                    timestamp=datetime.utcnow().isoformat(),
                    policy_version="cost-guard-1.0",
                    evaluator="cost-guard-service",
                ),
            )

        response = ExportResponse(decision=decision, cost_estimate=cost_estimate)

        # If allowed, generate export URLs
        if decision.effect == DecisionEffect.allow:
            response.export_url = f"https://exports.intelgraph.io/bundles/{request_id}"
            response.manifest_url = f"https://exports.intelgraph.io/manifests/{request_id}"
            response.bundle_hash = f"sha256:{_generate_mock_hash(request_id)}"

            # Background task to generate actual export
            background_tasks.add_task(_generate_export_bundle, request_id, request)

        duration = time.time() - start_time
        logger.info(
            f"Export request {request_id} processed in {duration:.3f}s, decision: {decision.effect}"
        )

        return response

    except Exception as e:
        logger.error(f"Export request {request_id} failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {request_id}")


@app.post("/export/simulate", response_model=SimulationResponse)
async def simulate_export(request: SimulateRequest):
    """
    Policy simulation endpoint for what-if analysis
    """
    request_id = str(uuid.uuid4())

    logger.info(f"Export simulation {request_id} received for tenant {request.context.tenant_id}")

    try:
        # Get baseline decision
        baseline_request = ExportRequest(
            action=request.action,
            dataset=request.dataset,
            context=request.context,
            case_id=request.case_id,
            claim_ids=request.claim_ids,
        )
        baseline_decision = PolicyEvaluator.evaluate_export_policy(baseline_request)

        # Run what-if scenarios
        scenarios = []
        for scenario in request.simulation.what_if_scenarios or []:
            # Apply scenario changes to context
            modified_context = request.context.copy()
            for key, value in scenario.changes.items():
                if hasattr(modified_context, key):
                    setattr(modified_context, key, value)

            scenario_request = ExportRequest(
                action=request.action,
                dataset=request.dataset,
                context=modified_context,
                case_id=request.case_id,
                claim_ids=request.claim_ids,
            )

            scenario_decision = PolicyEvaluator.evaluate_export_policy(scenario_request)

            # Calculate impact
            impact = ImpactAnalysis(
                decision_changed=baseline_decision.effect != scenario_decision.effect,
                violations_added=[
                    v.code
                    for v in scenario_decision.violations
                    if not any(bv.code == v.code for bv in baseline_decision.violations)
                ],
                violations_removed=[
                    v.code
                    for v in baseline_decision.violations
                    if not any(sv.code == v.code for sv in scenario_decision.violations)
                ],
                risk_level_change=(
                    f"{baseline_decision.risk_assessment.level} → {scenario_decision.risk_assessment.level}"
                    if baseline_decision.risk_assessment.level
                    != scenario_decision.risk_assessment.level
                    else "no change"
                ),
            )

            scenarios.append(
                ScenarioResult(name=scenario.name, decision=scenario_decision, impact=impact)
            )

        response = SimulationResponse(
            decision=baseline_decision,
            cost_estimate=CostEstimate(
                estimated_cost=0.0,  # Simulations are free
                budget_remaining=1000.0,  # Mock value
                budget_utilization=0.0,
            ),
            simulation_results=SimulationResults(baseline=baseline_decision, scenarios=scenarios),
        )

        logger.info(f"Export simulation {request_id} completed with {len(scenarios)} scenarios")
        return response

    except Exception as e:
        logger.error(f"Export simulation {request_id} failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {request_id}")


@app.get("/export/status/{request_id}", response_model=ExportStatus)
async def get_export_status(request_id: str):
    """
    Get the status of an export request
    """
    # Mock status response
    return ExportStatus(
        request_id=request_id,
        status="completed",
        created_at=(datetime.utcnow() - timedelta(minutes=5)).isoformat(),
        completed_at=datetime.utcnow().isoformat(),
        export_url=f"https://exports.intelgraph.io/bundles/{request_id}",
        manifest_url=f"https://exports.intelgraph.io/manifests/{request_id}",
        bundle_size_bytes=1024000,
        expiry_date=(datetime.utcnow() + timedelta(days=1)).isoformat(),
    )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# Helper functions
def _generate_mock_hash(input_str: str) -> str:
    """Generate a mock hash for demonstration"""
    return hashlib.sha256(input_str.encode()).hexdigest()[:64]


async def _generate_export_bundle(request_id: str, request: ExportRequest):
    """Background task to generate export bundle"""
    logger.info(f"Generating export bundle for request {request_id}")
    # Mock export generation
    await asyncio.sleep(2)  # Simulate processing time
    logger.info(f"Export bundle {request_id} generated successfully")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
