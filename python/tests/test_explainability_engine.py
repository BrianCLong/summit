import json
import os
from unittest.mock import AsyncMock, patch

import openai
import pytest
from intelgraph_py.analytics.explainability_engine import (
    ExplanationOutput,
    generate_explanation,
)
from intelgraph_py.cache import (
    generate_cache_key,
    get_cached_explanation,
    set_cached_explanation,
)


@pytest.fixture(autouse=True)
def clear_redis_cache():
    # Ensure Redis is clean before each test that uses caching
    # This assumes a local Redis instance for testing
    try:
        import redis

        client = redis.StrictRedis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            db=int(os.getenv("REDIS_DB", 0)),
        )
        client.flushdb()
    except Exception as e:
        print(f"Could not flush Redis for test setup: {e}")


@pytest.mark.asyncio
async def test_generate_explanation_success():
    mock_response_content = {
        "explanation_text": "Node X is part of community Y due to shared links.",
        "confidence_score": 0.95,
        "source_metadata": {"node_id": "X", "community_id": "Y"},
        "semantic_summary": "Community membership explanation.",
    }
    mock_openai_response = AsyncMock()
    mock_openai_response.choices = [AsyncMock()]
    mock_openai_response.choices[0].message.content = json.dumps(mock_response_content)
    mock_openai_response.return_value = mock_openai_response

    with patch("openai.ChatCompletion.acreate", return_value=mock_openai_response):
        insight_data = {
            "insight_type": "community_detection",
            "nodes": ["X", "A", "B"],
            "community_id": "Y",
        }
        explanation = await generate_explanation(insight_data)

        assert isinstance(explanation, ExplanationOutput)
        assert explanation.explanation_text == "Node X is part of community Y due to shared links."
        assert explanation.confidence_score == 0.95
        assert explanation.source_metadata == {"node_id": "X", "community_id": "Y"}
        assert explanation.semantic_summary == "Community membership explanation."


@pytest.mark.asyncio
async def test_generate_explanation_obfuscates_for_external():
    mock_response_content = {
        "explanation_text": "Node X is part of community Y due to shared links.",
        "confidence_score": 0.95,
        "source_metadata": {"node_id": "X", "community_id": "Y"},
        "semantic_summary": "Community membership explanation.",
    }
    mock_openai_response = AsyncMock()
    mock_openai_response.choices = [AsyncMock()]
    mock_openai_response.choices[0].message.content = json.dumps(mock_response_content)
    mock_openai_response.return_value = mock_openai_response

    with patch("openai.ChatCompletion.acreate", return_value=mock_openai_response):
        insight_data = {
            "insight_type": "community_detection",
            "nodes": ["X", "A", "B"],
            "community_id": "Y",
        }
        internal = await generate_explanation(insight_data, authority="internal")
        external = await generate_explanation(insight_data, authority="external")

        assert "Node X" in internal.explanation_text
        assert "community Y" in internal.explanation_text
        assert "[redacted]" in external.explanation_text
        assert external.source_metadata == {}


@pytest.mark.asyncio
async def test_generate_explanation_from_cache():
    insight_data = {
        "insight_type": "community_detection",
        "nodes": ["CachedNode"],
        "community_id": "CachedCommunity",
    }
    llm_model = "gpt-4o"
    cache_key = generate_cache_key(insight_data, llm_model, authority="internal")

    cached_explanation_data = {
        "explanation_text": "This is a cached explanation.",
        "confidence_score": 0.99,
        "source_metadata": insight_data,
        "semantic_summary": "Cached summary.",
    }
    set_cached_explanation(cache_key, cached_explanation_data)

    with patch("openai.ChatCompletion.acreate") as mock_openai_create, patch(
        "langchain_community.chat_models.ollama.ChatOllama.ainvoke"
    ) as mock_ollama_ainvoke:
        explanation = await generate_explanation(
            insight_data, llm_model=llm_model, authority="internal"
        )

        mock_openai_create.assert_not_called()
        mock_ollama_ainvoke.assert_not_called()

        assert isinstance(explanation, ExplanationOutput)
        assert explanation.explanation_text == "This is a cached explanation."
        assert explanation.confidence_score == 0.99


@pytest.mark.asyncio
async def test_generate_explanation_caches_new_explanation():
    mock_response_content = {
        "explanation_text": "Newly generated explanation.",
        "confidence_score": 0.90,
        "source_metadata": {"new_data": True},
        "semantic_summary": "New summary.",
    }
    mock_openai_response = AsyncMock()
    mock_openai_response.choices = [AsyncMock()]
    mock_openai_response.choices[0].message.content = json.dumps(mock_response_content)
    mock_openai_response.return_value = mock_openai_response

    insight_data = {"insight_type": "new_insight"}
    llm_model = "gpt-4o"
    cache_key = generate_cache_key(insight_data, llm_model, authority="internal")

    with patch("openai.ChatCompletion.acreate", return_value=mock_openai_response):
        explanation = await generate_explanation(
            insight_data, llm_model=llm_model, authority="internal"
        )

        assert isinstance(explanation, ExplanationOutput)
        assert explanation.explanation_text == "Newly generated explanation."

        # Verify it's now in cache
        cached_data = get_cached_explanation(cache_key)
        assert cached_data is not None
        assert cached_data["explanation_text"] == "Newly generated explanation."


@pytest.mark.asyncio
async def test_generate_explanation_local_llm_success():
    mock_response_content = {
        "explanation_text": "Local LLM explanation for Node X in community Y.",
        "confidence_score": 0.85,
        "source_metadata": {"node_id": "X", "community_id": "Y"},
        "semantic_summary": "Local LLM summary.",
    }
    mock_ollama_response = AsyncMock()
    mock_ollama_response.content = json.dumps(mock_response_content)
    mock_ollama_response.return_value = mock_ollama_response

    with patch(
        "langchain_community.chat_models.ollama.ChatOllama.ainvoke",
        return_value=mock_ollama_response,
    ):
        insight_data = {
            "insight_type": "community_detection",
            "nodes": ["X", "A", "B"],
            "community_id": "Y",
        }
        explanation = await generate_explanation(insight_data, llm_model="llama3")

        assert isinstance(explanation, ExplanationOutput)
        assert explanation.explanation_text == "Local LLM explanation for Node X in community Y."
        assert explanation.confidence_score == 0.85
        assert explanation.source_metadata == {"node_id": "X", "community_id": "Y"}
        assert explanation.semantic_summary == "Local LLM summary."


@pytest.mark.asyncio
async def test_generate_explanation_api_error():
    with patch("openai.ChatCompletion.acreate", side_effect=Exception("OpenAI API error")):
        insight_data = {"insight_type": "centrality", "central_node_id": "Z"}
        explanation = await generate_explanation(insight_data)

        assert isinstance(explanation, ExplanationOutput)
        assert "Failed to generate explanation" in explanation.explanation_text
        assert explanation.confidence_score == 0.0
        assert explanation.source_metadata == insight_data
        assert explanation.semantic_summary == "Error during explanation generation."


@pytest.mark.asyncio
async def test_generate_explanation_no_api_key():
    original_api_key = os.getenv("OPENAI_API_KEY")
    if original_api_key:
        del os.environ["OPENAI_API_KEY"]
    openai.api_key = None  # Ensure it's None for the test

    with pytest.raises(ValueError, match="OPENAI_API_KEY environment variable not set."):
        await generate_explanation({"insight_type": "test"})

    if original_api_key:
        os.environ["OPENAI_API_KEY"] = original_api_key
        openai.api_key = original_api_key
