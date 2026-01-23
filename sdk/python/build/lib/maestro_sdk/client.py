import httpx
class MaestroClient:
    def __init__(self, base_url, token=None):
        self._c = httpx.AsyncClient(base_url=base_url, headers={"Authorization": f"Bearer {token}"} if token else {})
    async def runs_list(self): return (await self._c.get("/api/maestro/v1/runs")).json()