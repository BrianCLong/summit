from fastapi import APIRouter, Depends, Header

from .audit import write as audit
from .auth import Role, require_role

router = APIRouter(prefix="/sre", tags=["sre"])


@router.post("/trigger_dr_drill")
def trigger_dr_drill(
    drill_id: str,
    x_tenant_id: str | None = Header(default="default_tenant", alias="X-Tenant-ID"),
    _: str = Depends(require_role(Role.admin)),
):
    # Placeholder for triggering a DR drill
    # This would involve interacting with a DR orchestration system
    audit(
        actor="admin",
        action="trigger_dr_drill",
        case_id=None,
        details={"drill_id": drill_id, "tenant_id": x_tenant_id},
    )
    return {"status": "DR drill triggered", "drill_id": drill_id, "tenant_id": x_tenant_id}


@router.post("/trigger_chaos_test")
def trigger_chaos_test(
    test_id: str,
    target_service: str,
    x_tenant_id: str | None = Header(default="default_tenant", alias="X-Tenant-ID"),
    _: str = Depends(require_role(Role.admin)),
):
    # Placeholder for triggering a chaos test
    # This would involve interacting with a chaos engineering platform (e.g., LitmusChaos, Chaos Mesh)
    audit(
        actor="admin",
        action="trigger_chaos_test",
        case_id=None,
        details={"test_id": test_id, "target_service": target_service, "tenant_id": x_tenant_id},
    )
    return {
        "status": "Chaos test triggered",
        "test_id": test_id,
        "target_service": target_service,
        "tenant_id": x_tenant_id,
    }
