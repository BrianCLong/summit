import pytest
import os
from unittest.mock import AsyncMock, MagicMock, patch
from summit.providers.moonshot import MoonshotProvider
from summit.providers.together import TogetherProvider
from summit.providers.stepfun_chat import StepFunChatProvider, StepFunChatConfig

@pytest.fixture
def mock_httpx_post():
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        yield mock_post

# --- Moonshot ---

@pytest.mark.asyncio
async def test_moonshot(mock_httpx_post):
    provider = MoonshotProvider(api_key="test")

    mock_response = MagicMock()
    mock_response.json.return_value = {"id": "1", "choices": []}
    mock_response.raise_for_status.return_value = None

    mock_httpx_post.return_value = mock_response

    res = await provider.chat_completion(messages=[])
    assert res["id"] == "1"
    mock_httpx_post.assert_called_once()
    assert "Authorization" in mock_httpx_post.call_args[1]["headers"]

@pytest.mark.asyncio
async def test_moonshot_no_key():
    provider = MoonshotProvider(api_key="")
    # Check if raises ValueError when called
    with pytest.raises(ValueError):
        await provider.chat_completion(messages=[])

# --- Together ---

@pytest.mark.asyncio
async def test_together_disabled():
    with patch.dict("os.environ", {}, clear=True):
        with pytest.raises(RuntimeError):
            TogetherProvider(api_key="test")

@pytest.mark.asyncio
async def test_together_enabled(mock_httpx_post):
    with patch.dict("os.environ", {"FEATURE_TOGETHER_KIMI": "1"}):
        provider = TogetherProvider(api_key="test")

        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "2"}
        mock_response.raise_for_status.return_value = None

        mock_httpx_post.return_value = mock_response

        res = await provider.chat_completion(messages=[])
        assert res["id"] == "2"

# --- StepFun ---

@pytest.mark.asyncio
async def test_stepfun(mock_httpx_post):
    cfg = StepFunChatConfig(api_key="test", base_url="https://api.stepfun.ai/v1")
    provider = StepFunChatProvider(cfg)

    mock_response = MagicMock()
    mock_response.json.return_value = {"id": "3"}
    mock_response.raise_for_status.return_value = None

    mock_httpx_post.return_value = mock_response

    res = await provider.chat_completions(model="model", messages=[])
    assert res["id"] == "3"

def test_stepfun_invalid_url():
    cfg = StepFunChatConfig(api_key="test", base_url="http://insecure")
    with pytest.raises(ValueError):
        StepFunChatProvider(cfg)
