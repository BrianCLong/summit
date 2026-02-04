from __future__ import annotations

import re


def html_to_markdown_safe(html: str) -> str:
    """
    Deterministic, sanitizer-first converter.
    Basic implementation using regex to avoid external dependencies for now.
    """
    # Remove scripts and styles
    html = re.sub(r"<(script|style).*?>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)

    # Very basic conversion for common tags
    # Headings
    html = re.sub(r"<h1.*?>(.*?)</h1>", r"# \1\n\n", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<h2.*?>(.*?)</h2>", r"## \1\n\n", html, flags=re.DOTALL | re.IGNORECASE)

    # Paragraphs
    html = re.sub(r"<p.*?>(.*?)</p>", r"\1\n\n", html, flags=re.DOTALL | re.IGNORECASE)

    # Links
    html = re.sub(r'<a.*?href="(.*?)".*?>(.*?)</a>', r"[\2](\1)", html, flags=re.IGNORECASE)

    # Strip remaining tags
    html = re.sub(r"<.*?>", "", html)

    # Normalize whitespace
    html = re.sub(r"\n\s*\n", "\n\n", html).strip()

    return html
