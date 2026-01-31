from typing import List, Dict, Any
import httpx
from .auth import AzureAuthProvider

class AzureFoundryCatalog:
    def __init__(self, endpoint: str, auth_provider: AzureAuthProvider):
        self.endpoint = endpoint.rstrip("/")
        self.auth_provider = auth_provider

    async def list_models(self) -> List[Dict[str, Any]]:
        """
        Lists available models/deployments.
        """
        token = self.auth_provider.get_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Foundry/Azure AI Studio typically has a list endpoints.
        # Azure OpenAI has /openai/deployments?api-version=...
        # We assume standard Azure OpenAI-like structure for now.

        url = f"{self.endpoint}/openai/deployments?api-version=2022-12-01"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=60.0)
            response.raise_for_status()
            data = response.json()
            # data structure: {"data": [{"id": "...", "model": "..."}]}
            return data.get("data", [])
