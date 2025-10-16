from fastapi import FastAPI, Header
from neo4j import GraphDatabase
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel

from .case_collab import router as collab_router
from .case_templates import router as case_templates_router
from .compliance import router as compliance_router

# Import connectors for backfill endpoints
from .connectors import reddit, rss, telegram, tiktok, twitter, youtube
from .entity_resolution import router as entity_resolution_router
from .entity_resolution_suggest import router as er_suggest_router
from .explain import router as explain_router
from .exports import router as exports_router
from .exports_bundle import router as bundle_router
from .legal_lens import router as legal_lens_router
from .narratives_api import router as narratives_router
from .slack_actions import router as slack_router
from .sre import router as sre_router
from .summarize import router as summarize_router

app = FastAPI()
app.include_router(exports_router)
app.include_router(explain_router)
app.include_router(case_templates_router)
app.include_router(summarize_router)
app.include_router(bundle_router)
app.include_router(slack_router)
app.include_router(collab_router)
app.include_router(entity_resolution_router)
app.include_router(narratives_router)
app.include_router(er_suggest_router)
app.include_router(legal_lens_router)
app.include_router(compliance_router)
app.include_router(sre_router)
Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j", "neo4jpass"))


class AutoCase(BaseModel):
    seed_accounts: list[str]
    reason: str


@app.get("/accounts/{acc_id}")
def get_account(
    acc_id: str, x_jurisdiction: str | None = Header(default=None, alias="X-Jurisdiction")
):
    with driver.session() as s:
        # Fetch legal constraints for the given jurisdiction
        legal_constraints = []
        if x_jurisdiction:
            constraints_data = s.run(
                """
            MATCH (j:Jurisdiction {code:$jurisdiction_code})<-[:APPLIES_TO]-(lc:LegalConstraint)
            RETURN lc.id AS id, lc.statute AS statute, lc.type AS type, lc.scope AS scope
            """,
                jurisdiction_code=x_jurisdiction,
            ).data()
            legal_constraints = [c["id"] for c in constraints_data]

        # Modify the query to include legal constraints (simplified example)
        query = "MATCH (a:Account {id:$id}) RETURN a"
        if "data_retention" in legal_constraints:  # Example constraint
            query = "MATCH (a:Account {id:$id}) WHERE a.created_at > datetime() - duration('P90D') RETURN a"  # Only return accounts created in last 90 days

        rec = s.run(query, id=acc_id).single()
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
        s.run(
            """
          CALL gds.graph.project('coord','Account',{COORDINATION:{type:'COORDINATION',properties:'score'}})
        """
        )
        data = s.run(
            """
          CALL gds.louvain.stream('coord', {relationshipWeightProperty:'score'})
          YIELD nodeId, communityId
          WITH communityId, collect(gds.util.asNode(nodeId).id) AS members
          WITH communityId, members, size(members) AS sz
          WHERE sz >= $min
          RETURN communityId, members, sz
          ORDER BY sz DESC
        """,
            min=minSize,
        ).data()
        s.run("CALL gds.graph.drop('coord',false) YIELD graphName")
        return data


@app.post("/cases/autocreate")
def autocreate(
    case: AutoCase, x_tenant_id: str | None = Header(default="default_tenant", alias="X-Tenant-ID")
):
    with driver.session() as s:
        rec = s.run(
            """
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
        CREATE (c:Case {id:uuid, reason:$reason, created:datetime(), tenant_id:$tenant_id})
        WITH c, NODES
        UNWIND NODES AS n MERGE (c)-[:INCLUDES]->(n)
        RETURN c.id AS id, c.reason AS reason, c.created AS created
        """,
            {"seeds": case.seed_accounts, "reason": case.reason, "tenant_id": x_tenant_id},
        ).single()
    # emit socket/kafka as needed (omitted for brevity)
    return {"id": rec["id"], "reason": rec["reason"], "created": rec["created"].isoformat()}


@app.get("/cases/{case_id}")
def get_case(
    case_id: str, x_tenant_id: str | None = Header(default="default_tenant", alias="X-Tenant-ID")
):
    with driver.session() as s:
        rec = s.run(
            """
        MATCH (c:Case {id:$id, tenant_id:$tenant_id}) OPTIONAL MATCH (c)-[:INCLUDES]->(a:Account)
        RETURN c{.*, nodes:collect(DISTINCT a{.id,.source,.eigenvector,.betweenness,.community})} AS c
        """,
            id=case_id,
            tenant_id=x_tenant_id,
        ).single()
        return rec["c"] if rec else {}


# Backfill endpoints for K6 load testing
@app.post("/backfill/twitter")
def backfill_twitter(since_epoch_ms: int = 0):
    twitter.backfill(since_epoch_ms)
    return {"status": "triggered twitter backfill"}


@app.post("/backfill/youtube")
def backfill_youtube(since_epoch_ms: int = 0):
    youtube.backfill(since_epoch_ms)
    return {"status": "triggered youtube backfill"}


@app.post("/backfill/reddit")
def backfill_reddit(since_epoch_ms: int = 0):
    reddit.backfill(since_epoch_ms)
    return {"status": "triggered reddit backfill"}


@app.post("/backfill/telegram")
def backfill_telegram(since_epoch_ms: int = 0):
    telegram.backfill(since_epoch_ms)
    return {"status": "triggered telegram backfill"}


@app.post("/backfill/tiktok")
def backfill_tiktok(since_epoch_ms: int = 0):
    tiktok.backfill(since_epoch_ms)
    return {"status": "triggered tiktok backfill"}


@app.post("/backfill/rss")
def backfill_rss(since_epoch_ms: int = 0):
    rss.backfill(since_epoch_ms)
    return {"status": "triggered rss backfill"}
