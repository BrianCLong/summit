import faust, os, json, requests
from neo4j import GraphDatabase
import motif # Import motif.py
from time import time
from prometheus_client import start_http_server, Counter

start_http_server(9200)  # expose /metrics
METRIC_EDGES = Counter('intelgraph_coord_edges', 'coord edges emitted')
METRIC_ALERTS = Counter('intelgraph_coord_alerts', 'coord alerts sent')

BROKER = os.getenv("KAFKA_BROKER","kafka:9092")
app = faust.App("intelgraph", broker=f"kafka://{BROKER}")
raw = app.topic("raw.*", value_type=dict, pattern=True)
edges = app.topic("features.edges.coord", value_type=dict)
alerts = app.topic("alerts.coord", value_type=dict)
cases = app.topic("cases.autocreate", value_type=dict)

WIN = 180
THRESH_PAIR = 3.0
THRESH_CLUSTER = 5

driver = GraphDatabase.driver(os.getenv("NEO4J_URI"), auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASS")))
co_cache = app.Table("co_table", default=list)

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL","")
WEBHOOK_COORD_URLS = [u for u u in os.getenv("WEBHOOK_COORD_URLS","").split(",") if u]
def _notify(payload):
    txt = f"⚠️ Coordination spike: {payload['a']} ↔ {payload['b']} (score {payload['score']})"
    if SLACK_WEBHOOK_URL:
        try: requests.post(SLACK_WEBHOOK_URL, json={"text": txt}, timeout=5)
        except: pass
    for u in WEBHOOK_COORD_URLS:
        try: requests.post(u, json=payload, timeout=5)
        except: pass

Debounce = {}  # (a,b)-> last_ts
PAIRED_COOLDOWN = 600  # 10 min

@app.agent(raw)
async def detect(stream):
    async for msg in stream:
        key = (msg.get("text","")[:64], msg.get("url"))
        ts = int(msg["ts"]/1000)
        buf = [h for h in co_cache[key] if ts - h["ts"] <= WIN]
        for h in buf:
            score = 0.5
            if msg.get("url") and msg["url"] == h.get("url"): score += 0.5
            shared = len(set(msg.get("hashtags",[])) & set(h.get("hashtags",[])))
            score += min(0.3, 0.05*shared)
            payload = {"a": msg["account_id"], "b": h["account_id"], "score": float(round(score,3)), "ts": msg["ts"]}
            await edges.send(value=payload); METRIC_EDGES.inc()
            if score >= THRESH_PAIR:
                pair = tuple(sorted([payload['a'], payload['b']]))
                now = int(time())
                last = Debounce.get(pair, 0)
                if now - last >= PAIRED_COOLDOWN:
                    await alerts.send(value={"type":"coord_pair","payload":payload})
                    _notify(payload); METRIC_ALERTS.inc()
                    Debounce[pair] = now
        buf.append({"account_id": msg["account_id"], "ts": ts, "hashtags": msg.get("hashtags",[]), "url": msg.get("url")})
        co_cache[key] = buf

@app.agent(edges)
async def upsert(stream):
    async for e in stream:
        with driver.session() as s:
            r = s.run("""
              MATCH (a:Account {id:$a}) WITH a
              OPTIONAL MATCH (b:Account {id:$b})
              RETURN a.rhythm_harmonic AS ra, a.rhythm_index AS ia, b.rhythm_harmonic AS rb, b.rhythm_index AS ib
            """, e).single()
            boost = 0.0
            if r and r['ra'] is not None and r['rb'] is not None and r['ra'] == r['rb'] and (r['ia'] or 0)>=1.5 and (r['ib'] or 0)>=1.5:
                boost = 0.2
            s.run("""
              MERGE (a:Account {id:$a}) MERGE (b:Account {id:$b})
              MERGE (a)-[c:COORDINATION]-(b)
              SET c.score = coalesce(c.score,0) + $score + $boost, c.updated = datetime()
            """, {**e, "boost": boost})
            res = s.run("""
              MATCH (a:Account {id:$a})-[:COORDINATION]-(x)-[:COORDINATION]-(b:Account {id:$b})
              RETURN count(DISTINCT x) AS bridgers
            """, e).single()
            if res and res["bridgers"] >= THRESH_CLUSTER:
                await cases.send(value={"seed_accounts":[e["a"],e["b"]],"reason":"coord_threshold"})