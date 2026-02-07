"""TechCrunch ingestion helpers with safe HTML parsing."""
from __future__ import annotations

from dataclasses import dataclass
from html.parser import HTMLParser


@dataclass(frozen=True)
class TechCrunchArticle:
    title: str
    body_text: str


class _SafeTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style"}:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style"} and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        chunk = data.strip()
        if chunk:
            self._chunks.append(chunk)

    def text(self) -> str:
        return " ".join(self._chunks).strip()


def extract_text(html: str) -> str:
    """Extract readable text from HTML with script/style stripping."""
    parser = _SafeTextExtractor()
    parser.feed(html)
    parser.close()
    return parser.text()


def parse_techcrunch_html(html: str, *, title_hint: str = "") -> TechCrunchArticle:
    """Parse TechCrunch HTML into a minimal, safe article representation."""
    body_text = extract_text(html)
    title = title_hint or body_text.split(".", 1)[0]
    return TechCrunchArticle(title=title.strip(), body_text=body_text)
