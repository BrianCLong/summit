import os
import yaml
import re
from pathlib import Path
from typing import List, Optional

class SummitPolicyEngine:
    def __init__(self, config_path: str = "policy/tool_allowlist.yaml"):
        self.enabled = os.environ.get("SUMMIT_POLICY_ENABLE", "1") == "1"
        self.config_path = Path(config_path)
        self.allowed_tools = set()
        self.allowed_domains = set()
        self._load_config()

    def _load_config(self):
        if not self.config_path.exists():
            print(f"WARNING: Policy config {self.config_path} not found.")
            return

        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                self.allowed_tools = set(data.get("allowed_tools", []))
                self.allowed_domains = set(data.get("allowed_domains", []))
        except Exception as e:
            print(f"ERROR: Failed to load policy config: {e}")

    def is_tool_allowed(self, tool_name: str) -> bool:
        if not self.enabled:
            return True
        return tool_name in self.allowed_tools

    def is_domain_allowed(self, domain: str) -> bool:
        if not self.enabled:
            return True
        # Simple suffix match for now (e.g. sub.example.com matches example.com)
        # In a real engine, we'd use robust URL parsing
        domain = domain.lower().strip()
        for allowed in self.allowed_domains:
            if domain == allowed or domain.endswith("." + allowed):
                return True
        return False

    def scrub_content(self, content: str) -> str:
        """
        Sanitizes content to mitigate prompt injection risks.
        - Strips <script> tags
        - Detects and neutralizes "Ignore previous instructions" patterns
        """
        if not self.enabled:
            return content

        # 1. Simple HTML tag stripping (naive)
        content = re.sub(r"<script.*?>.*?</script>", "[BLOCKED_SCRIPT]", content, flags=re.IGNORECASE|re.DOTALL)

        # 2. Injection pattern detection
        # Matches variations of "ignore previous instructions"
        injection_pattern = r"(ignore|disregard)\s+(all\s+)?(previous|prior)\s+(instructions|commands|prompts)"

        if re.search(injection_pattern, content, re.IGNORECASE):
            content = re.sub(injection_pattern, "[BLOCKED_INJECTION_ATTEMPT]", content, flags=re.IGNORECASE)

        return content
