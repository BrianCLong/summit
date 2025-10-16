"""
Advanced social listening scaffold.

Design goals:
- Multi-source ingestion (RSS, X/Twitter API v2, Reddit, Mastodon, news feeds)
- Normalization to a common schema with source weights and provenance
- Rate-limit aware, backoff, and content de-duplication via hashing
- Pluggable NER + event extraction (spaCy, stanza) + sentiment

This module provides interfaces and stubs; actual API credentials and
connectors should be added per deployment.
"""

import datetime as _dt
import json
import os
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

import defusedxml.ElementTree as ET
from intelgraph_py.utils.file_security import safe_path_join

try:
    # Optional: if requests is available, we can fetch http(s)
    import requests  # type: ignore
except Exception:  # pragma: no cover
    requests = None  # type: ignore


@dataclass
class SocialPost:
    id: str
    source: str
    author: str
    text: str
    url: str
    timestamp: str


def _read_bytes_from_uri(uri: str) -> bytes:
    """Read bytes from http(s), file://, or local path.

    This keeps the connector usable in offline environments by supporting file paths.
    """
    parsed = urlparse(uri)
    # Local file path or file:// scheme
    if parsed.scheme in ("", "file"):
        path = parsed.path if parsed.scheme == "file" else uri
        # Validate path using safe_path_join
        validated_path = safe_path_join(Path.cwd(), path)
        with open(validated_path, "rb") as f:
            return f.read()
    # HTTP(S)
    if parsed.scheme in ("http", "https"):
        if not requests:
            raise RuntimeError("requests not available to fetch HTTP(S) content")
        resp = requests.get(uri, timeout=15)
        resp.raise_for_status()
        return resp.content
    raise ValueError(f"Unsupported URI scheme: {parsed.scheme}")


def fetch_rss(feed_url: str) -> Iterable[SocialPost]:
    """Parse a minimal RSS/Atom feed into SocialPost entries.

    Supports http(s), file:// URIs, and direct local file paths.
    """
    data = _read_bytes_from_uri(feed_url)
    # Try to parse as XML and extract common fields
    root = ET.fromstring(data)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    posts: list[SocialPost] = []

    # RSS 2.0: <channel><item>
    channel = root.find("channel")
    if channel is not None:
        for item in channel.findall("item"):
            guid = (
                item.findtext("guid") or item.findtext("link") or item.findtext("title") or ""
            ).strip()
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            author = (item.findtext("author") or item.findtext("dc:creator") or "").strip()
            pubdate = (item.findtext("pubDate") or "").strip()
            # Fallback to now if missing timestamp
            ts = pubdate or _dt.datetime.utcnow().isoformat() + "Z"
            posts.append(
                SocialPost(
                    id=guid or link or title,
                    source="rss",
                    author=author or "unknown",
                    text=title,
                    url=link,
                    timestamp=ts,
                )
            )
        return posts

    # Atom: <entry>
    for entry in root.findall("atom:entry", ns) or root.findall("entry"):
        entry_id = (
            entry.findtext("atom:id", default="", namespaces=ns) or entry.findtext("id") or ""
        ).strip()
        title = (
            entry.findtext("atom:title", default="", namespaces=ns) or entry.findtext("title") or ""
        ).strip()
        link_el = entry.find("atom:link", ns) or entry.find("link")
        href = link_el.get("href") if link_el is not None else ""
        author_el = entry.find("atom:author/atom:name", ns) or entry.find("author/name")
        author = author_el.text.strip() if author_el is not None and author_el.text else "unknown"
        updated = (
            entry.findtext("atom:updated", default="", namespaces=ns)
            or entry.findtext("updated")
            or ""
        ).strip()
        ts = updated or _dt.datetime.utcnow().isoformat() + "Z"
        posts.append(
            SocialPost(
                id=entry_id or href or title,
                source="atom",
                author=author,
                text=title,
                url=href,
                timestamp=ts,
            )
        )
    return posts


def fetch_twitter(query: str) -> Iterable[SocialPost]:
    """Lightweight Twitter fetch.

    Behavior:
    - If env TWITTER_MOCK_FILE is set, read JSON lines from that file for offline use.
    - Otherwise, if TWITTER_BEARER_TOKEN is set and requests available, hit the v2 recent search API.
    - Else, return empty list to keep the pipeline non-failing.
    """
    mock_path = os.getenv("TWITTER_MOCK_FILE")
    if mock_path and os.path.exists(mock_path):
        posts: list[SocialPost] = []
        with open(mock_path, encoding="utf-8") as f:
            for line in f:
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                tid = str(obj.get("id") or obj.get("id_str") or obj.get("_id") or "")
                text = obj.get("text") or obj.get("full_text") or ""
                author = (
                    (obj.get("user") or {}).get("screen_name")
                    if isinstance(obj.get("user"), dict)
                    else (obj.get("author") or "unknown")
                )
                url = f"https://twitter.com/i/web/status/{tid}" if tid else ""
                ts = obj.get("created_at") or _dt.datetime.utcnow().isoformat() + "Z"
                posts.append(
                    SocialPost(
                        id=tid or url or text[:20],
                        source="twitter",
                        author=author or "unknown",
                        text=text,
                        url=url,
                        timestamp=ts,
                    )
                )
        return posts

    token = os.getenv("TWITTER_BEARER_TOKEN")
    if token and requests:
        # Minimal v2 recent search call
        endpoint = "https://api.twitter.com/2/tweets/search/recent"
        headers = {"Authorization": f"Bearer {token}"}
        params = {"query": query, "tweet.fields": "created_at,author_id", "max_results": 10}
        try:
            resp = requests.get(endpoint, headers=headers, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json().get("data", [])
        except Exception:
            data = []
        posts: list[SocialPost] = []
        for t in data:
            tid = str(t.get("id", ""))
            text = t.get("text", "")
            author = str(t.get("author_id", "unknown"))
            url = f"https://twitter.com/i/web/status/{tid}" if tid else ""
            ts = t.get("created_at") or _dt.datetime.utcnow().isoformat() + "Z"
            posts.append(
                SocialPost(
                    id=tid or url or text[:20],
                    source="twitter",
                    author=author,
                    text=text,
                    url=url,
                    timestamp=ts,
                )
            )
        return posts

    # Graceful fallback
    return []
