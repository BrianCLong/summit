from typing import List, Dict, Any
from .policy import WideSeekPolicy

class SearchTool:
    def __init__(self, policy: WideSeekPolicy):
        self.policy = policy
        self.mock_results = {
            "test query": [
                {"title": "Test Result 1", "url": "https://example.com/1", "snippet": "Snippet 1"},
                {"title": "Test Result 2", "url": "https://example.com/2", "snippet": "Snippet 2"},
            ]
        }

    def search(self, query: str) -> List[Dict[str, str]]:
        # In a real impl, this would call an API
        results = self.mock_results.get(query.lower(), [])

        # Filter by policy
        filtered = []
        for res in results:
            if self.policy.check_url(res["url"]):
                filtered.append(res)

        return filtered
