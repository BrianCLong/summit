import json

import pytest

from summit_sdk import KnowledgeBase, PolicyContext, SummitClient, flow, tool


def test_tool_validation_and_execution():
    @tool()
    def add(x: int, y: int) -> int:
        return x + y

    client = SummitClient(api_key="demo")
    result = add.invoke({"x": 2, "y": 3}, client.emitter)
    assert result == 5

    with pytest.raises(Exception):
        add.invoke({"x": "bad", "y": 3}, client.emitter)


def test_flow_runs_and_exposes_graph():
    client = SummitClient(api_key="demo")

    @flow(emitter=client.emitter, policy_defaults={"tenant": "acme"})
    def hello(name: str) -> str:
        return f"hi {name}"

    assert hello("alice") == "hi alice"
    graph = hello.to_graph()
    assert graph.name == "hello"
    assert graph.nodes[0]["inputs"] == ["name"]
    graph_json = json.loads(graph.to_json())
    assert graph_json["policy_defaults"] == {"tenant": "acme"}


def test_model_and_rag_integration():
    client = SummitClient(api_key="demo")
    kb = KnowledgeBase(client, profile="frontier_core")
    policy = PolicyContext(tenant="acme", region="us-east")

    ctx = kb.retrieve("what is summit?", policy=policy)
    assert ctx.policy == policy
    assert ctx.passages[0]["content"].startswith("Mock passage")

    response = client.model("frontier-1.3b").chat(
        messages=[{"role": "user", "content": "hello"}],
        context=ctx,
        tools=[],
        policy=policy,
    )
    assert "mock:frontier-1.3b" in response["text"]
    assert response["context_used"] is True


def test_trace_emitter_records_span(capfd):
    client = SummitClient(api_key="demo")
    span = client.emitter.span("unit-test", {"key": "value"})
    span.finish({"status": "ok"})
    captured = capfd.readouterr().out
    assert "unit-test" in captured
    assert client.emitter.trace_id in captured
