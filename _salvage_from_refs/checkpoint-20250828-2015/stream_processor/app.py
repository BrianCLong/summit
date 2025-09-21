import asyncio, json, os, time
from aiokafka import AIOKafkaConsumer
import aioredis
from datetime import datetime

KAFKA = os.getenv("KAFKA_BROKERS","localhost:9092")
REDIS = os.getenv("REDIS_URL","redis://localhost:6379/0")

FEATURE_TTL = 7*24*3600  # 7 days

async def update_features(r, tenant, node_id, ts_iso, attrs):
    key = f"feat:{tenant}:{node_id}"
    # Incrementals
    pipe = r.pipeline()
    pipe.hincrby(key, "degree", int(attrs.get("degree_inc", 0)))
    pipe.hset(key, mapping={
        "last_seen": ts_iso,
        "last_weight": attrs.get("weight", 0),
        "type": attrs.get("type","unknown"),
    })
    pipe.expire(key, FEATURE_TTL)
    await pipe.execute()

async def emit_anomaly(r, tenant, node_id):
    # simple rule: degree jump > 5 within 1 minute triggers alert count
    key = f"feat:{tenant}:{node_id}"
    deg = int(await r.hget(key, "degree") or 0)
    if deg > 100:  # toy threshold
        await r.publish(f"alerts:{tenant}", json.dumps({
            "id": f"deg-{node_id}-{int(time.time())}", "tenantId": tenant,
            "caseId": "auto", "nodeIds": [node_id], "severity": "medium",
            "kind": "degree_spike", "reason": f"degree={deg}", "ts": datetime.utcnow().isoformat()
        }))

async def consume():
    r = await aioredis.from_url(REDIS)
    consumer = AIOKafkaConsumer(
        "intelgraph.entities.v1", "intelgraph.edges.v1",
        bootstrap_servers=KAFKA, enable_auto_commit=False,
        auto_offset_reset="earliest", group_id="feature-agg-1"
    )
    await consumer.start()
    try:
        async for msg in consumer:
            data = json.loads(msg.value.decode("utf-8"))
            topic = msg.topic
            if topic.endswith("entities.v1"):
                await update_features(r, data["tenantId"], data["id"], data["ts"], {"type": data["type"], "degree_inc": 0})
            elif topic.endswith("edges.v1"):
                await update_features(r, data["tenantId"], data["src"], data["ts"], {"weight": data.get("weight",1), "degree_inc": 1})
                await update_features(r, data["tenantId"], data["dst"], data["ts"], {"weight": data.get("weight",1), "degree_inc": 1})
                await emit_anomaly(r, data["tenantId"], data["src"])
                await emit_anomaly(r, data["tenantId"], data["dst"])
            await consumer.commit()
    finally:
        await consumer.stop()

if __name__ == "__main__":
    asyncio.run(consume())
