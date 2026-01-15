import html
import re
import urllib.parse
import urllib.request
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Protocol

from .models import Document


class SearchClient(Protocol):
    """Protocol for search implementations."""

    def search(self, query: str, *, limit: int = 5) -> list[tuple[str, str]]:
        """Return a list of (title, url) tuples."""
        ...


@dataclass
class DuckDuckGoSearchClient:
    """Lightweight HTML scraper for DuckDuckGo's HTML endpoint.

    This keeps dependencies minimal while providing a simple search option
    that works without API keys. It intentionally avoids JavaScript and only
    scrapes the basic HTML page, so it should be used responsibly and with
    modest volume.
    """

    base_url: str = "https://duckduckgo.com/html/"

    def search(self, query: str, *, limit: int = 5) -> list[tuple[str, str]]:
        params = {"q": query, "ia": "web"}
        encoded = urllib.parse.urlencode(params)
        url = f"{self.base_url}?{encoded}"
        with urllib.request.urlopen(url) as response:
            page = response.read().decode("utf-8", errors="ignore")
        # DuckDuckGo renders links in <a class="result__a" href="...">.
        links = re.findall(r"<a[^>]+class=\"result__a\"[^>]+href=\"([^\"]+)\"[^>]*>(.*?)</a>", page)
        items: list[tuple[str, str]] = []
        for href, title_html in links:
            clean_title = re.sub("<.*?>", "", title_html)
            items.append((html.unescape(clean_title), html.unescape(href)))
            if len(items) >= limit:
                break
        return items


class ContentFetcher(Protocol):
    """Protocol for turning URLs into text content."""

    def fetch(self, url: str) -> str: ...


@dataclass
class HttpContentFetcher:
    """Fetches a URL and strips HTML to lightweight text."""

    user_agent: str = "summit-multi-doc-summarizer"

    def fetch(self, url: str) -> str:
        request = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
        with urllib.request.urlopen(request) as response:
            raw_html = response.read().decode("utf-8", errors="ignore")
        text = re.sub(r"<script.*?</script>", " ", raw_html, flags=re.S)
        text = re.sub(r"<style.*?</style>", " ", text, flags=re.S)
        text = re.sub(r"<[^>]+>", " ", text)
        return html.unescape(re.sub(r"\s+", " ", text)).strip()


class DocumentRetriever:
    """High-level utility for retrieving documents."""

    def __init__(self, search_client: SearchClient, content_fetcher: ContentFetcher):
        self.search_client = search_client
        self.content_fetcher = content_fetcher

    def retrieve(self, query: str, *, limit: int = 5) -> list[Document]:
        results = self.search_client.search(query, limit=limit)
        documents: list[Document] = []
        for title, url in results:
            content = self.content_fetcher.fetch(url)
            if not content:
                continue
            documents.append(Document(title=title, url=url, content=content))
        return documents


class StaticDocumentRetriever:
    """Returns a static list of documents (useful for testing/air-gapped usage)."""

    def __init__(self, documents: Iterable[Document]):
        self._documents = list(documents)

    def retrieve(self, query: str, *, limit: int = 5) -> list[Document]:
        _ = query
        return self._documents[:limit]
