from fastapi import APIRouter, Depends, HTTPException, Header
from neo4j import GraphDatabase
import os, json
from .auth import require_role, Role
from .audit import write as audit

router = APIRouter(prefix="/compliance", tags=["compliance"])
driver = GraphDatabase.driver(os.getenv("NEO4J_URI","bolt://neo4j:7687"),
                              auth=(os.getenv("NEO4J_USER","neo4j"), os.getenv("NEO4J_PASS","neo4jpass")))

@router.get("/foia_dsar_report/{entity_id}")
def foia_dsar_report(entity_id: str, x_tenant_id: str | None = Header(default="default_tenant", alias="X-Tenant-ID"), _: str = Depends(require_role(Role.admin))):
    # Placeholder for generating a FOIA/DSAR report for a given entity
    # This would involve querying all data related to the entity across Neo4j, Postgres, etc.
    # and compiling it into a structured report (e.g., PDF, JSON).
    audit(actor="admin", action="foia_dsar_report", case_id=None, details={"entity_id": entity_id, "tenant_id": x_tenant_id})
    return {"status": "report generation initiated", "entity_id": entity_id, "tenant_id": x_tenant_id, "report_url": "/reports/foia_dsar_report_placeholder.pdf"}

@router.delete("/purge_entity/{entity_id}")
def purge_entity(entity_id: str, x_tenant_id: str | None = Header(default="default_tenant", alias="X-Tenant-ID"), _: str = Depends(require_role(Role.admin))):
    # Placeholder for purging all data related to an entity
    # This would involve deleting nodes/relationships in Neo4j, records in Postgres, etc.
    with driver.session() as s:
        s.run("MATCH (n {id:$entity_id, tenant_id:$tenant_id}) DETACH DELETE n", entity_id=entity_id, tenant_id=x_tenant_id)
    audit(actor="admin", action="purge_entity", case_id=None, details={"entity_id": entity_id, "tenant_id": x_tenant_id})
    return {"status": "entity purged", "entity_id": entity_id, "tenant_id": x_tenant_id}

@router.delete("/purge_case/{case_id}")
def purge_case(case_id: str, x_tenant_id: str | None = Header(default="default_tenant", alias="X-Tenant-ID"), _: str = Depends(require_role(Role.admin))):
    # Placeholder for purging all data related to a case
    with driver.session() as s:
        s.run("MATCH (c:Case {id:$case_id, tenant_id:$tenant_id}) DETACH DELETE c", case_id=case_id, tenant_id=x_tenant_id)
    audit(actor="admin", action="purge_case", case_id=case_id, details={"tenant_id": x_tenant_id})
    return {"status": "case purged", "case_id": case_id, "tenant_id": x_tenant_id}