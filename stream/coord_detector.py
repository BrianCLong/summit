import faust, math, time
from neo4j import GraphDatabase

app = faust.App('intelgraph', broker='kafka://kafka:9092')
raw = app.topic('raw.*', value_type=dict)   # pattern
edges = app.topic('features.edges.coord', value_type=dict)
alerts = app.topic('alerts.coord', value_type=dict)
cases = app.topic('cases.autocreate', value_type=dict)

WIN = 180  # seconds (Δt)
THRESH = 3.0

# Neo4j connection details - these should ideally come from environment variables
neo4j_uri = "bolt://neo4j:7687"
neo4j_user = "neo4j"
neo4j_pwd = "password" # Make sure this matches the docker-compose.yml

driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_pwd))

@app.agent(raw)
async def detect(stream):
    async for msg in stream:
        acc = msg['account_id']; ts = int(msg['ts'])
        key = (msg['hash_text'], msg.get('url'))
        # simple local cache keyed by (hash_text,url) for Δt co-posts
        co = app.tables.get('co', partitions=1)
        hist = co.get(key, [])
        hist = [h for h in hist if ts - h['ts'] <= WIN]
        for h in hist:
            score = 0.5  # burst
            if msg.get('url') and msg['url'] == h.get('url'): score += 0.5
            shared_tags = len(set(msg.get('hashtags',[])) & set(h.get('hashtags',[])))
            score += min(0.3, 0.05 * shared_tags)
            payload = {"a": acc, "b": h['account_id'], "score": score, "ts": ts}
            await edges.send(value=payload)
            if score >= THRESH:
                await alerts.send(value={"type":"coord_pair", "payload": payload})
        hist.append({"account_id": acc, "ts": ts, "hashtags": msg.get('hashtags',[]), "url": msg.get('url')})
        co[key] = hist

@app.agent(edges)
async def upsert_neo4j(stream):
    async for e in stream:
        with driver.session() as s:
            s.run("""
                MERGE (a:Account {id:$a}) MERGE (b:Account {id:$b})
                MERGE (a)-[c:COORDINATION]-(b)
                SET c.score = coalesce(c.score,0) + $score, c.updated = datetime()
            """, e)
            # cluster trigger (simplified)
            res = s.run("""
              MATCH (a:Account {id:$a})-[:COORDINATION]-(x)-[:COORDINATION]-(b:Account {id:$b})
              WITH collect(DISTINCT x) AS m
              RETURN size(m) AS msize
            """, e).single()
            if res and res['msize'] >= 5:
                await cases.send(value={"seed_accounts":[e['a'], e['b']], "reason":"coord_threshold"})
