from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse, urlunparse

ALLOWED_HOSTS = {"mp.weixin.qq.com"}


class UrlRejected(ValueError):
    pass


@dataclass(frozen=True)
class CanonicalUrl:
    url: str
    host: str
    path: str


def canonicalize_and_validate(raw: str) -> CanonicalUrl:
    p = urlparse(raw.strip())
    if p.scheme not in ("https", "http"):
        raise UrlRejected("scheme_not_allowed")
    host = (p.hostname or "").lower()
    if host not in ALLOWED_HOSTS:
        raise UrlRejected("host_not_allowlisted")
    # Strip fragments; keep query/path
    clean = p._replace(fragment="")
    return CanonicalUrl(url=urlunparse(clean), host=host, path=clean.path or "/")
