import requests

from .types import PolicyContext


class PolicyClient:
    def __init__(self, base_url: str, session: requests.Session | None = None):
        self.base_url = base_url
        self.session = session or requests.Session()

    def evaluate(self, ctx: PolicyContext) -> dict:
        r = self.session.post(f"{self.base_url}/policy/evaluate", json=ctx, timeout=10)
        r.raise_for_status()
        return r.json()
