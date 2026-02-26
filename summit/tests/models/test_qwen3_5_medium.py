from unittest.mock import MagicMock, patch

import pytest

from summit.models.adapter import ModelOutput
from summit.models.qwen.qwen3_5_medium import Qwen35MediumAdapter


@pytest.fixture
def mock_httpx_client():
    with patch("httpx.Client") as mock:
        yield mock

@pytest.fixture
def mock_httpx_async_client():
    with patch("httpx.AsyncClient") as mock:
        yield mock

def test_qwen_adapter_init():
    adapter = Qwen35MediumAdapter(api_key="test-key")
    assert adapter.api_key == "test-key"
    assert adapter.MODEL_ID == "qwen3.5-medium"

def test_qwen_adapter_generate(mock_httpx_client):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "Hello from Qwen!"}}],
        "usage": {"total_tokens": 10}
    }
    mock_httpx_client.return_value.__enter__.return_value.post.return_value = mock_response

    adapter = Qwen35MediumAdapter(api_key="test-key")
    output = adapter.generate("Hello")

    assert isinstance(output, ModelOutput)
    assert output.text == "Hello from Qwen!"
    assert output.usage["total_tokens"] == 10
    assert output.metadata["model"] == "qwen3.5-medium"

@pytest.mark.asyncio
async def test_qwen_adapter_generate_async(mock_httpx_async_client):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "Async hello!"}}],
        "usage": {"total_tokens": 5}
    }

    # Mocking the async post call
    mock_httpx_async_client.return_value.__aenter__.return_value.post.return_value = mock_response

    adapter = Qwen35MediumAdapter(api_key="test-key")
    output = await adapter.generate_async("Hello")

    assert output.text == "Async hello!"
    assert output.usage["total_tokens"] == 5
