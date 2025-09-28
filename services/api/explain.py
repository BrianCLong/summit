from fastapi import APIRouter
from neo4j import GraphDatabase

router = APIRouter()
driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j","neo4jpass"))

@router.get("/explain/edge")
def explain_edge(a: str, b: str):
    with driver.session() as s:
        edge = s.run("""
        MATCH (a:Account {id:$a})-[c:COORDINATION]-(b:Account {id:$b})
        OPTIONAL MATCH (a)-[:USES]->(h:Hashtag)<-[:USES]-(b)
        WITH c, collect(DISTINCT h.name)[..10] AS tags
        RETURN c.score AS score, c.updated AS updated, tags
        """, {"a":a,"b":b}).single()
        if not edge: return {}
        # pull recent near-duplicate messages as examples
        sims = s.run("""
        MATCH (a:Account {id:$a})-[:POSTED]->(m1:Message),
              (b:Account {id:$b})-[:POSTED]->(m2:Message)
        WHERE abs(m1.ts - m2.ts) < duration({minutes:3}) AND m1.text IS NOT NULL AND m2.text IS NOT NULL
        RETURN m1.text AS a_text, m2.text AS b_text, m1.url AS url
        ORDER BY abs(m1.ts - m2.ts) ASC LIMIT 3
        """, {"a":a,"b":b}).data()
    return {"score": edge["score"], "updated": str(edge["updated"]), "tags": edge["tags"], "examples": sims}

@router.get("/explain/cluster/{case_id}")
def explain_cluster(case_id: str):
    with driver.session() as s:
        rec = s.run("""
        MATCH (c:Case {id:$id})-[:INCLUDES]->(a:Account)-[r:COORDINATION]-(b:Account)
        RETURN sum(r.score) AS total, count(r) AS edges, avg(r.score) AS avg,
               apoc.coll.sortNodes(collect(DISTINCT a), 'eigenvector', 'DESC')[..10] AS top
        """, {"id":case_id}).single()
        return {"total_score": rec["total"], "edges": rec["edges"], "avg_edge": rec["avg"],
                "top_accounts": [ {"id":n["id"], "src":n["source"], "eig":n.get("eigenvector")} for n in rec["top"] ]}