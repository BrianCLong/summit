from fastapi import APIRouter, Depends, Request
from .auth import require_role, Role
from neo4j import GraphDatabase
import time, hashlib

router = APIRouter()
driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j","neo4jpass"))

@router.get("/exports/case/{case_id}")
async def export_case(case_id: str, role: str = Depends(require_role(Role.lead)), request: Request=None):
    ip = request.client.host if request and request.client else "unknown"
    with driver.session() as s:
        rec = s.run("""
        MATCH (c:Case {id:$id})-[:INCLUDES]->(n:Account)
        RETURN c{.*, nodes:collect(DISTINCT n{.id,.source,.community})} AS payload
        """, id=case_id).single()
        if not rec: return {}
        payload = rec["payload"]
    # watermark
    stamp = int(time.time())
    wm = hashlib.sha256(f"{case_id}|{stamp}|{role}".encode()).hexdigest()[:10]
    payload["watermark"] = {"by_role": role, "ts": stamp, "sig": wm}
    # audit
    # (could also write to Postgres)
    print(f"[AUDIT] export case={case_id} role={role} ip={ip} ts={stamp}")
    return payload