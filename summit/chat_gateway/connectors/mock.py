from typing import Any, Dict, List, Optional

from summit.chat_gateway.interface import ChatConnector


class MockConnector(ChatConnector):
    def __init__(self, incoming: list[dict[str, Any]] = None):
        self.incoming = incoming or []
        self.outgoing = []

    def receive(self) -> Optional[dict[str, Any]]:
        if not self.incoming:
            return None
        msg = self.incoming.pop(0)
        # Provenance labeling hook
        if "provenance" not in msg:
             msg["provenance"] = "untrusted_external"
        return msg

    def send(self, recipient: str, text: str):
        self.outgoing.append({"recipient": recipient, "text": text})
