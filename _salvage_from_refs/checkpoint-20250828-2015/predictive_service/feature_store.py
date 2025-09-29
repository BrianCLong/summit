import aioredis, os, asyncio

REDIS = os.getenv("REDIS_URL","redis://localhost:6379/0")
_r = None
async def get_redis():
    global _r
    if _r is None: _r = await aioredis.from_url(REDIS)
    return _r

async def read_features(tenant: str, node_id: str):
    r = await get_redis()
    return await r.hgetall(f"feat:{tenant}:{node_id}")
