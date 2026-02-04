import json

from .adapter import ProtocolAdapter
from .envelope import SummitEnvelope, ToolCall


class LoopbackAdapter(ProtocolAdapter):
  def encode(self, env: SummitEnvelope) -> bytes:
    obj = {
      "message_id": env.message_id,
      "conversation_id": env.conversation_id,
      "sender": env.sender,
      "recipient": env.recipient,
      "intent": env.intent,
      "text": env.text,
      "tool_calls": [{"name": t.name, "arguments": t.arguments} for t in env.tool_calls],
      "explanations": list(env.explanations),
      "security": dict(env.security),
    }
    return json.dumps(obj, sort_keys=True).encode("utf-8")

  def decode(self, payload: bytes) -> SummitEnvelope:
    obj = json.loads(payload.decode("utf-8"))
    return SummitEnvelope(
      message_id=obj["message_id"],
      conversation_id=obj["conversation_id"],
      sender=obj["sender"],
      recipient=obj["recipient"],
      intent=obj["intent"],
      text=obj.get("text", ""),
      tool_calls=[ToolCall(**t) for t in obj.get("tool_calls", [])],
      explanations=obj.get("explanations", []),
      security=obj.get("security", {}),
    )
