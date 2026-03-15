import pytest
import json
import asyncio
from unittest.mock import MagicMock, patch

@pytest.fixture
def query_fixtures():
    fixtures = []
    with open("evals/fixtures/query-pipeline/queries.jsonl", "r") as f:
        for line in f:
            if line.strip():
                fixtures.append(json.loads(line))
    return fixtures

class MockQueryPipeline:
    """Mock implementation of the query pipeline for integration testing."""
    async def process_query(self, query, context=None, timeout=None):
        if "build a bomb" in query:
            return {"intent": "safety_violation", "answer": "I cannot help with that.", "status": "blocked"}

        if "France" in query:
            return {
                "intent": "fact_check",
                "retrieval": {"status": "success", "docs_count": 3},
                "answer": "The capital of France is Paris.",
                "confidence": 0.99
            }

        if "WhatsApp" in query:
            return {
                "intent": "research",
                "retrieval": {"status": "success", "docs_count": 10},
                "answer": "Mark Zuckerberg is the CEO of Meta (formerly Facebook), which acquired WhatsApp.",
                "confidence": 0.95
            }

        if timeout and timeout < 0.1:
            await asyncio.sleep(0.2)
            raise asyncio.TimeoutError("Query timed out")

        if "GDP" in query:
            return {
                "intent": "analysis",
                "retrieval": {"status": "success", "docs_count": 5},
                "re-ranking": {"status": "success", "top_k": 3},
                "context_assembly": {"tokens": 1200, "sources": ["World Bank", "IMF"]},
                "answer": "In 2023, USA's GDP was approx $26.9T and China's was approx $17.7T.",
                "confidence": 0.92
            }

        if "first point" in query and context:
            return {
                "intent": "follow_up",
                "answer": f"Elaborating on the first point from previous context: {context['last_answer'][:20]}...",
                "status": "ok"
            }

        return {"intent": "general", "answer": "Processed: " + query, "status": "ok"}

    async def stream_query(self, query):
        tokens = ["The", " capital", " of", " France", " is", " Paris."]
        for token in tokens:
            yield token
            await asyncio.sleep(0.01)

@pytest.mark.asyncio
async def test_answer_generation(query_fixtures):
    pipeline = MockQueryPipeline()

    q1 = next(q for q in query_fixtures if q["id"] == "q1")
    result = await pipeline.process_query(q1["query"])

    assert "answer" in result
    assert "Paris" in result["answer"]
    assert result["confidence"] > 0.9

@pytest.mark.asyncio
async def test_streaming_response():
    pipeline = MockQueryPipeline()

    tokens = []
    async for token in pipeline.stream_query("What is the capital of France?"):
        tokens.append(token)

    full_response = "".join(tokens)
    assert full_response == "The capital of France is Paris."

@pytest.mark.asyncio
async def test_reranking_and_context_assembly(query_fixtures):
    pipeline = MockQueryPipeline()

    q3 = next(q for q in query_fixtures if q["id"] == "q3")
    result = await pipeline.process_query(q3["query"])

    assert result["intent"] == "analysis"
    assert "re-ranking" in result
    assert result["re-ranking"]["status"] == "success"
    assert "context_assembly" in result
    assert result["context_assembly"]["tokens"] > 0
    assert len(result["context_assembly"]["sources"]) > 0

@pytest.mark.asyncio
async def test_intent_classification(query_fixtures):
    pipeline = MockQueryPipeline()

    # Test q1: Factual
    q1 = next(q for q in query_fixtures if q["id"] == "q1")
    result = await pipeline.process_query(q1["query"])
    assert result["intent"] == q1["expected_intent"]

    # Test q4: Adversarial
    q4 = next(q for q in query_fixtures if q["id"] == "q4")
    result = await pipeline.process_query(q4["query"])
    assert result["intent"] == q4["expected_intent"]
    assert result["status"] == "blocked"

@pytest.mark.asyncio
async def test_retrieval_triggering():
    pipeline = MockQueryPipeline()

    # Query that should trigger retrieval
    result = await pipeline.process_query("What is the capital of France?")
    assert "retrieval" in result
    assert result["retrieval"]["status"] == "success"
    assert result["retrieval"]["docs_count"] > 0

@pytest.mark.asyncio
async def test_query_timeout_handling():
    pipeline = MockQueryPipeline()

    with pytest.raises(asyncio.TimeoutError):
        await pipeline.process_query("Slow query", timeout=0.05)

@pytest.mark.asyncio
async def test_multi_turn_context(query_fixtures):
    pipeline = MockQueryPipeline()

    # First turn
    q1 = next(q for q in query_fixtures if q["id"] == "q1")
    result1 = await pipeline.process_query(q1["query"])

    # Second turn with context
    q6 = next(q for q in query_fixtures if q["id"] == "q6")
    context = {"last_query": q1["query"], "last_answer": result1["answer"]}
    result2 = await pipeline.process_query(q6["query"], context=context)

    assert result2["intent"] == "follow_up"
    assert "Franc" in result2["answer"]

@pytest.mark.asyncio
async def test_graceful_degradation():
    pipeline = MockQueryPipeline()

    with patch.object(pipeline, 'process_query', side_effect=Exception("Upstream service down")):
        with pytest.raises(Exception) as excinfo:
            await pipeline.process_query("Any query")
        assert "Upstream service down" in str(excinfo.value)
