# services/web-agent/extractors/changelog_v1.py
from bs4 import BeautifulSoup


def extract_changelog_v1(html: str, url: str):
    s = BeautifulSoup(html, "html.parser")
    items = []
    for li in s.select("li"):  # fallback heuristic
        t = li.get_text(" ", strip=True)
        if any(x in t.lower() for x in ["fix", "change", "add", "breaking", "security"]):
            items.append({"key": "change", "value": t[:300], "conf": 0.6, "sourceUrl": url})
    return items[:25]
