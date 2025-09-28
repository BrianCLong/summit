import os
from fastapi import APIRouter, HTTPException, Depends
from neo4j import GraphDatabase
import requests
from .audit import write as audit
from .auth import require_role, Role

router = APIRouter()
driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j","neo4jpass"))
SUMMARIES_URL = os.getenv("SUMMARIES_URL", "http://summaries:9201")

ALLOW_ANALYST = os.getenv("ALLOW_ANALYST_SUMMARIZE","false").lower() == "true"
GUARD = require_role(Role.analyst if ALLOW_ANALYST else Role.lead)

@router.post("/cases/{case_id}/summarize")
def summarize_case(case_id: str, _: str = Depends(GUARD)):
    with driver.session() as s:
        rec = s.run("""
        MATCH (c:Case {id:$id})-[:INCLUDES]->(a:Account)-[:POSTED]->(m:Message)
        WHERE m.text IS NOT NULL
        RETURN collect(m.text) AS texts
        """, id=case_id).single()
        if not rec or not rec["texts"]: raise HTTPException(status_code=404, detail="Case or texts not found")

        full_text = " ".join(rec["texts"])
        r = requests.post(f"{SUMMARIES_URL}/summarize", json={"text": full_text}, timeout=120)
        r.raise_for_status()
        summary = r.json()["summary"]

        s.run("""
        MATCH (c:Case {id:$id})
        SET c.summary = $summary, c.summary_updated = datetime()
        """, id=case_id, summary=summary)
    audit(actor="system", action="summarize_case", case_id=case_id, details={"summary_length": len(summary)})
    return {"case_id": case_id, "summary": summary}