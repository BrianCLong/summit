from __future__ import annotations
from dataclasses import dataclass
from typing import Iterable
from urllib.parse import urlparse

DEFAULT_ALLOWED_DOMAINS = {
    "cdn.agentclientprotocol.com",
}

import os

@dataclass(frozen=True)
class AcpPolicy:
    registry_enabled: bool = True
    install_enabled: bool = False
    allowed_download_domains: frozenset[str] = frozenset(DEFAULT_ALLOWED_DOMAINS)

    @classmethod
    def from_env(cls) -> AcpPolicy:
        return cls(
            install_enabled=os.environ.get("SUMMIT_ENABLE_ACP_INSTALL") == "1"
        )

def assert_https_and_allowlisted(url: str, policy: AcpPolicy) -> None:
    p = urlparse(url)
    if p.scheme != "https":
        raise ValueError(f"GATE-ACP-SC-001: non-https url: {url}")
    host = (p.hostname or "").lower()
    if host not in policy.allowed_download_domains:
        raise ValueError(f"GATE-ACP-SC-001: domain not allowlisted: {host}")
