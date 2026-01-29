from typing import Protocol, Dict, Any, Optional

class ChatConnector(Protocol):
    def receive(self) -> Optional[Dict[str, Any]]:
        """Receive message from channel."""
        ...

    def send(self, recipient: str, text: str):
        """Send message to channel."""
        ...
