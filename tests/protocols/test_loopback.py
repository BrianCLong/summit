from summit.protocols.envelope import SummitEnvelope, ToolCall
from summit.protocols.loopback import LoopbackAdapter


def test_loopback_roundtrip():
    adapter = LoopbackAdapter()
    env = SummitEnvelope(
        message_id="m1",
        conversation_id="c1",
        sender="alice",
        recipient="bob",
        intent="REQUEST",
        text="Hello",
        tool_calls=[ToolCall(name="calculator", arguments={"x": 1})],
        explanations=["because"],
        security={"token": "123"}
    )
    payload = adapter.encode(env)
    decoded = adapter.decode(payload)
    assert decoded == env
    assert decoded.tool_calls[0].name == "calculator"
