import asyncio
from typing import Dict
from fastapi import HTTPException, status
from ..storage.memory_store import store

class TenantConcurrency:
    def __init__(self, limit: int, queue_limit: int = 1000):
        self.sem = asyncio.Semaphore(limit)
        self.queue_count = 0
        self.queue_limit = queue_limit

class ConcurrencyGuard:
    def __init__(self):
        self.tenants: Dict[str, TenantConcurrency] = {}
        self.lock = asyncio.Lock()

    async def get_guard(self, tenant_id: str) -> TenantConcurrency:
        async with self.lock:
            if tenant_id not in self.tenants:
                limit = store.get_max_concurrency(tenant_id)
                self.tenants[tenant_id] = TenantConcurrency(limit)
            return self.tenants[tenant_id]

    async def acquire(self, api_key: str):
        tenant_id = store.get_tenant_id(api_key)
        if tenant_id == "unknown":
            return # Should not happen if auth passes

        guard = await self.get_guard(tenant_id)

        if guard.queue_count >= guard.queue_limit:
             raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Concurrency queue limit exceeded",
                headers={"Retry-After": "10"}
            )

        guard.queue_count += 1
        try:
            # Try to acquire immediately or wait
            # We could implement a timeout here if needed
            await guard.sem.acquire()
        finally:
            guard.queue_count -= 1

    def release(self, api_key: str):
        tenant_id = store.get_tenant_id(api_key)
        if tenant_id in self.tenants:
            self.tenants[tenant_id].sem.release()

concurrency_guard = ConcurrencyGuard()
