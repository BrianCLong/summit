from typing import Any, Optional
from urllib.parse import urlparse
import httpx
from .auth import AzureAuthProvider
from .catalog import AzureFoundryCatalog


def _is_azure_openai_endpoint(endpoint: str) -> bool:
    candidate = endpoint if "://" in endpoint else f"https://{endpoint}"
    parsed = urlparse(candidate)
    hostname = (parsed.hostname or "").lower()
    return hostname == "openai.azure.com" or hostname.endswith(".openai.azure.com")

class AzureFoundryProvider:
    """
    Provider for Microsoft Foundry (Azure AI) models.
    Supports both Azure OpenAI resources and Foundry Model-as-a-Service (MaaS) endpoints.
    """
    def __init__(self, endpoint: str, auth_provider: Optional[AzureAuthProvider] = None):
        self.endpoint = endpoint.rstrip("/")
        self.auth_provider = auth_provider or AzureAuthProvider()
        self.catalog_service = AzureFoundryCatalog(self.endpoint, self.auth_provider)
        self.is_azure_openai = _is_azure_openai_endpoint(self.endpoint)

    async def get_catalog(self) -> list[dict[str, Any]]:
        return await self.catalog_service.list_models()

    async def chat_completion(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]] = None,
        model: str = "gpt-4",
        temperature: float = 0.7
    ) -> dict[str, Any]:
        """
        Sends a chat completion request.
        """
        token = self.auth_provider.get_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Determine URL based on endpoint pattern
        if self.is_azure_openai:
            # Azure OpenAI resource pattern
            # model argument is treated as deployment_id
            deployment_id = model
            url = f"{self.endpoint}/openai/deployments/{deployment_id}/chat/completions?api-version=2024-02-15-preview"
        else:
            # Foundry / MaaS pattern
            # The endpoint usually points to the model serving endpoint directly
            url = f"{self.endpoint}/chat/completions"

        payload = {
            "messages": messages,
            "temperature": temperature,
            "model": model # Included for compatibility, though ignored by some MaaS
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                json=payload,
                timeout=120.0
            )
            response.raise_for_status()
            return response.json()
