import random
import uuid
from datetime import datetime
from typing import Iterator, Dict, Any
from .base import BaseConnector

class MockSourceConnector(BaseConnector):
    """
    Mock connector that generates synthetic intelligence data.
    """

    def __init__(self, source_name: str = "mock_source"):
        self.source_name = source_name

    def get_source_name(self) -> str:
        return self.source_name

    def fetch_data(self, limit: int = 100) -> Iterator[Dict[str, Any]]:
        """
        Generates synthetic data simulating social media posts or intelligence reports.
        """
        entities = ["UserA", "UserB", "OrgX", "OrgY", "BotNetZ"]
        topics = ["cyber", "finance", "politics", "tech"]

        for _ in range(limit):
            record = {
                "id": str(uuid.uuid4()),
                "source": self.source_name,
                "timestamp": datetime.now().isoformat(),
                "author": random.choice(entities),
                "content": f"This is a report about {random.choice(topics)}.",
                "metadata": {
                    "likes": random.randint(0, 1000),
                    "shares": random.randint(0, 500),
                    "sentiment": random.uniform(-1, 1)
                }
            }
            yield record
