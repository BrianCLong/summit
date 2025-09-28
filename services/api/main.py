from fastapi import FastAPI, Query
from pydantic import BaseModel
from neo4j import GraphDatabase
from datetime import datetime
from .exports import router as exports_router
from .explain import router as explain_router
from .case_templates import router as case_templates_router
from .summarize import router as summarize_router
from .exports_bundle import router as bundle_router
from .slack_actions import router as slack_router
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()
app.include_router(exports_router)
app.include_router(explain_router)
app.include_router(case_templates_router)
app.include_router(summarize_router)
app.include_router(bundle_router)
app.include_router(slack_router)
Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j","neo4jpass"))

class AutoCase(BaseModel):
    seed_accounts: list[str]
    reason: str

@app.get("/accounts/{acc_id}")
def get_account(acc_id: str):
    with driver.session() as s:
        rec = s.run("MATCH (a:Account {id:$id}) RETURN a", id=acc_id).single()
        return rec["a"] if rec else {}

@app.get("/coord/edges")
def edges(a: str, min: float = 3.0):
    with driver.session() as s:
        q = """
        MATCH (x:Account {id:$a})-[c:COORDINATION]-(b:Account)
        WHERE c.score >= $min
        RETURN x.id AS a, b.id AS b, c.score AS score
        ORDER BY score DESC LIMIT 500
        """
        return [r.data() for r in s.run(q, a=a, min=min)]

@app.get("/coord/communities")
def communities(minSize: int = 5):
    with driver.session() as s:
        s.run("""
          CALL gds.graph.project('coord','Account',{COORDINATION:{type:'COORDINATION',properties:'score'}})
        """)
        data = s.run("""
          CALL gds.louvain.stream('coord', {relationshipWeightProperty:'score'})
          YIELD nodeId, communityId
          WITH communityId, collect(gds.util.asNode(nodeId).id) AS members
          WITH communityId, members, size(members) AS sz
          WHERE sz >= $min
          RETURN communityId, members, sz
          ORDER BY sz DESC
        """, min=minSize).data()
        s.run("CALL gds.graph.drop('coord',false) YIELD graphName")
        return data

@app.post("/cases/autocreate")
def autocreate(case: AutoCase):
    with driver.session() as s:
        rec = s.run("""
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
        CREATE (c:Case {id:uuid, reason:$reason, created:datetime()})
        WITH c, NODES
        UNWIND NODES AS n MERGE (c)-[:INCLUDES]->(n)
        RETURN c.id AS id, c.reason AS reason, c.created AS created
        """, {"seeds": case.seed_accounts, "reason": case.reason}).single()
    # emit socket/kafka as needed (omitted for brevity)
    return {"id": rec["id"], "reason": rec["reason"], "created": rec["created"].isoformat()}

@app.get("/cases/{case_id}")
def get_case(case_id: str):
    with driver.session() as s:
        rec = s.run("""
        MATCH (c:Case {id:$id}) OPTIONAL MATCH (c)-[:INCLUDES]->(a:Account)
        RETURN c{.*, nodes:collect(DISTINCT a{.id,.source,.eigenvector,.betweenness,.community})} AS c
        """, id=case_id).single()
        return rec["c"] if rec else {}
