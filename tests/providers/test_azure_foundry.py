import os
import time
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from summit.providers.azure_foundry.auth import AzureAuthProvider
from summit.providers.azure_foundry.client import AzureFoundryProvider

def test_auth_provider_token_generation():
    # Provide dummy credentials
    auth = AzureAuthProvider(tenant_id="tid", client_id="cid", client_secret="secret")

    def side_effect():
        auth._token = "mock_token_123"
        auth._expires_at = time.time() + 3600
        return "mock_token_123"

    with patch.object(auth, "_fetch_token_http", side_effect=side_effect) as mock_fetch:
        token = auth.get_token()
        assert token == "mock_token_123"
        mock_fetch.assert_called_once()

        # Test caching
        token2 = auth.get_token()
        assert token2 == "mock_token_123"
        mock_fetch.assert_called_once() # Should not be called again

def test_client_init():
    mock_auth = MagicMock(spec=AzureAuthProvider)
    provider = AzureFoundryProvider(endpoint="https://example.com", auth_provider=mock_auth)
    assert provider.endpoint == "https://example.com"
    assert provider.auth_provider == mock_auth

@pytest.mark.asyncio
async def test_chat_completion_openai():
    endpoint = "https://mock-foundry.openai.azure.com"
    mock_auth = MagicMock(spec=AzureAuthProvider)
    mock_auth.get_token.return_value = "mock_token"

    provider = AzureFoundryProvider(endpoint=endpoint, auth_provider=mock_auth)

    mock_response_data = {"choices": []}

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__.return_value = mock_client

        mock_response_obj = MagicMock()
        mock_response_obj.json.return_value = mock_response_data
        mock_response_obj.raise_for_status = MagicMock()

        mock_client.post.return_value = mock_response_obj

        messages = [{"role": "user", "content": "Hi"}]
        await provider.chat_completion(messages=messages, model="gpt-4")

        expected_url = f"{endpoint}/openai/deployments/gpt-4/chat/completions?api-version=2024-02-15-preview"
        mock_client.post.assert_called_once()
        assert mock_client.post.call_args[0][0] == expected_url

@pytest.mark.asyncio
async def test_chat_completion_maas():
    endpoint = "https://my-model.region.models.ai.azure.com"
    mock_auth = MagicMock(spec=AzureAuthProvider)
    mock_auth.get_token.return_value = "mock_token"

    provider = AzureFoundryProvider(endpoint=endpoint, auth_provider=mock_auth)

    mock_response_data = {"choices": []}

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__.return_value = mock_client

        mock_response_obj = MagicMock()
        mock_response_obj.json.return_value = mock_response_data
        mock_response_obj.raise_for_status = MagicMock()

        mock_client.post.return_value = mock_response_obj

        messages = [{"role": "user", "content": "Hi"}]
        await provider.chat_completion(messages=messages, model="Llama-2-70b")

        expected_url = f"{endpoint}/chat/completions"
        mock_client.post.assert_called_once()
        assert mock_client.post.call_args[0][0] == expected_url

@pytest.mark.asyncio
async def test_get_catalog():
    endpoint = "https://mock-foundry.openai.azure.com"
    mock_auth = MagicMock(spec=AzureAuthProvider)
    mock_auth.get_token.return_value = "mock_token"

    provider = AzureFoundryProvider(endpoint=endpoint, auth_provider=mock_auth)

    mock_response_data = {"data": [{"id": "gpt-4"}]}

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__.return_value = mock_client

        mock_response_obj = MagicMock()
        mock_response_obj.json.return_value = mock_response_data
        mock_response_obj.raise_for_status = MagicMock()

        mock_client.get.return_value = mock_response_obj

        models = await provider.get_catalog()
        assert len(models) == 1
