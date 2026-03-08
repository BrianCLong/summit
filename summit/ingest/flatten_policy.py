from typing import List, Optional, Set


class FlatteningPolicy:
    def __init__(
        self,
        enabled: bool = False,
        allowlist: Optional[list[str]] = None,
        denylist: Optional[list[str]] = None,
        max_depth: int = 5,
        max_list_items: int = 10,
        redaction_patterns: Optional[list[str]] = None,
        never_embed: Optional[set[str]] = None
    ):
        self.enabled = enabled
        self.allowlist = allowlist
        self.denylist = denylist
        self.max_depth = max_depth
        self.max_list_items = max_list_items
        self.redaction_patterns = redaction_patterns or []
        self.never_embed = never_embed or {"ssn", "password", "token", "secret", "credit_card"}

    def is_allowed(self, key: str) -> bool:
        if key in self.never_embed:
            return False
        if self.denylist and key in self.denylist:
            return False
        if self.allowlist is not None:
            return key in self.allowlist
        return True
