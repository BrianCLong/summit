from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from summit.models.adapter import ModelOutput
from summit.models.qwen.qwen3_5_medium import Qwen35MediumAdapter


@pytest.fixture
def adapter():
    with patch("httpx.Client"), patch("httpx.AsyncClient"):
        return Qwen35MediumAdapter(api_key="test-key")

def test_qwen_adapter_init():
    with patch("httpx.Client"), patch("httpx.AsyncClient"):
        adapter = Qwen35MediumAdapter(api_key="test-key")
        assert adapter.api_key == "test-key"
        assert adapter.MODEL_ID == "qwen3.5-medium"

def test_qwen_adapter_generate(adapter):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "Hello from Qwen!"}}],
        "usage": {"total_tokens": 10}
    }
    adapter._client.post = MagicMock(return_value=mock_response)

    output = adapter.generate("Hello")

    assert isinstance(output, ModelOutput)
    assert output.text == "Hello from Qwen!"
    assert output.usage["total_tokens"] == 10
    assert output.metadata["model"] == "qwen3.5-medium"

@pytest.mark.asyncio
async def test_qwen_adapter_generate_async(adapter):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "Async hello!"}}],
        "usage": {"total_tokens": 5}
    }

    adapter._async_client.post = AsyncMock(return_value=mock_response)

    output = await adapter.generate_async("Hello")

    assert output.text == "Async hello!"
    assert output.usage["total_tokens"] == 5
