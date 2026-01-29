class PermissionBroker:
    def __init__(self, mode: str, allowlist=None):
        self.mode = mode  # "headless" | "interactive"
        self.allowlist = allowlist or {}

    def decide(self, request: dict) -> dict:
        rtype = request.get("type")
        if self.mode == "headless":
            # In headless, default deny unless explicitly allowlisted (if we implement that logic)
            # For now, strict deny-by-default as per plan
            return {"outcome": "selected", "optionId": "reject_once"}

        # Interactive logic placeholder: check allowlist
        # Key format: (type, toolName|url|path)
        tool_name = request.get("toolName")
        url = request.get("url")
        path = request.get("path")

        # Priority: toolName, then url, then path
        identifier = tool_name or url or path

        key = (rtype, identifier)
        if key in self.allowlist:
            return {"outcome": "selected", "optionId": "allow_once"}

        return {"outcome": "selected", "optionId": "reject_once"}
