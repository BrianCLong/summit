from typing import Dict, Any
from .policy import WideSeekPolicy

class AccessTool:
    def __init__(self, policy: WideSeekPolicy):
        self.policy = policy
        self.mock_content = {
            "https://example.com/1": "Content of example 1 relating to query",
            "https://example.com/2": "Content of example 2 relating to query"
        }

    def access(self, url: str, query: str = "") -> str:
        if not self.policy.check_url(url):
            return "Error: URL denied by policy"

        return self.mock_content.get(url, "Error: 404 Not Found")
