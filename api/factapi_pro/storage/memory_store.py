from typing import Dict

class MemoryStore:
    def __init__(self):
        # MWS: Hardcoded mapping
        self.key_to_tenant: Dict[str, str] = {
            "test-key-123": "tenant-default",
            "valid-key": "tenant-pro",
            "quota-exceeded-key": "tenant-limited"
        }
        self.quotas: Dict[str, int] = {
            "tenant-default": 1000,
            "tenant-pro": 10000,
            "tenant-limited": 5
        }
        self.usage: Dict[str, int] = {
            "tenant-default": 0,
            "tenant-pro": 0,
            "tenant-limited": 5 # Already hit limit
        }
        self.concurrency: Dict[str, int] = {
            "tenant-default": 2,
            "tenant-pro": 10,
            "tenant-limited": 1
        }

    def get_tenant_id(self, api_key: str) -> str:
        return self.key_to_tenant.get(api_key, "unknown")

    def get_usage(self, tenant_id: str) -> int:
        return self.usage.get(tenant_id, 0)

    def increment_usage(self, tenant_id: str) -> int:
        current = self.usage.get(tenant_id, 0)
        self.usage[tenant_id] = current + 1
        return self.usage[tenant_id]

    def get_quota(self, tenant_id: str) -> int:
        return self.quotas.get(tenant_id, 0)

    def get_max_concurrency(self, tenant_id: str) -> int:
        return self.concurrency.get(tenant_id, 2)

store = MemoryStore()
