from fastapi import APIRouter
from neo4j import GraphDatabase

router = APIRouter()
driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j","neo4jpass"))

TEMPLATES = {
  "coord_default": [
    {"name":"Top Bridges", "cypher":"MATCH (a)-[r:COORDINATION]-(b) WHERE exists((:Case {id:$case_id})-[:INCLUDES]->(a)) RETURN a.id,b.id,r.score ORDER BY r.score DESC LIMIT 100"},
    {"name":"Motif Burst Motifs", "cypher":"MATCH (c:Case {id:$case_id})-[:INCLUDES]->(:Account)-[:USES]->(h:Hashtag) RETURN h.name, count(*) AS n ORDER BY n DESC LIMIT 50"}
  ]
}

@router.post("/cases/{case_id}/apply-template/{name}")
def apply_template(case_id: str, name: str):
    return {"case_id": case_id, "applied": TEMPLATES.get(name,[])}