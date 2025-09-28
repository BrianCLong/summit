from fastapi import FastAPI, APIRouter
from pydantic import BaseModel
from neo4j import GraphDatabase
import os

app = FastAPI()
router = APIRouter()

# Neo4j connection details - these should ideally come from environment variables
neo4j_uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
neo4j_user = os.getenv("NEO4J_USER", "neo4j")
neo4j_pwd = os.getenv("NEO4J_PASSWORD", "password") # Make sure this matches the docker-compose.yml

driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_pwd))

class AutoCase(BaseModel):
    seed_accounts: list[str]
    reason: str

@router.post("/cases/autocreate")
def autocreate(case: AutoCase):
    with driver.session() as s:
        res = s.run("""
        WITH $seeds AS ids
        MATCH (a:Account) WHERE a.id IN ids
        WITH collect(a) AS seeds
        CALL {
          WITH seeds
          MATCH p=(s)-[:COORDINATION*1..3]-(t) WHERE s IN seeds
          RETURN collect(DISTINCT nodes(p)) AS ns
        }
        WITH apoc.coll.toSet(apoc.coll.flatten(ns)) AS NODES
        CALL apoc.create.uuid() YIELD uuid
        CREATE (c:Case {id:uuid, created:datetime(), reason:$reason})
        WITH c, NODES
        UNWIND NODES AS n MERGE (c)-[:INCLUDES]->(n)
        RETURN c.id AS id
        """, {"seeds": case.seed_accounts, "reason": case.reason}).single()
    return {"case_id": res["id"]}

app.include_router(router)