from fastapi import HTTPException, status
from ..storage.memory_store import store

class MeteringService:
    def check_quota(self, api_key: str):
        tenant_id = store.get_tenant_id(api_key)
        if tenant_id == "unknown":
             # If unknown tenant (but valid key?), maybe allow or deny.
             # Middleware checks validity. If valid key but no tenant, something is wrong.
             return

        usage = store.get_usage(tenant_id)
        quota = store.get_quota(tenant_id)

        if usage >= quota:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Quota exceeded"
            )

    def record_usage(self, api_key: str):
        tenant_id = store.get_tenant_id(api_key)
        if tenant_id != "unknown":
            store.increment_usage(tenant_id)

metering_service = MeteringService()
