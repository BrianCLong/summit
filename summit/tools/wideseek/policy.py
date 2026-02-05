from typing import Set, List
from urllib.parse import urlparse

class WideSeekPolicy:
    def __init__(self, allowlist: Set[str] = None):
        self.allowlist = allowlist or set()
        self.deny_all = False

    def check_url(self, url: str) -> bool:
        if self.deny_all:
            return False
        if not self.allowlist:
            return False # Default deny if allowlist is empty? Or if unset?
                         # Plan says "Default runtime feature-flag OFF... deny-by-default; allowlist required"

        try:
            domain = urlparse(url).netloc
            return domain in self.allowlist
        except:
            return False

    def set_deny_all(self, deny: bool):
        self.deny_all = deny
