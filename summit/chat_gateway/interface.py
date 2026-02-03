from typing import Any, Dict, Optional, Protocol


class ChatConnector(Protocol):
    def receive(self) -> Optional[dict[str, Any]]:
        """Receive message from channel."""
        ...

    def send(self, recipient: str, text: str):
        """Send message to channel."""
        ...
