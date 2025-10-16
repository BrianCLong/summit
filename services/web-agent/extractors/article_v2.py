# services/web-agent/extractors/article_v2.py
from bs4 import BeautifulSoup


def extract_article_v2(html: str, url: str):
    s = BeautifulSoup(html, "html.parser")
    title = (s.find(["h1", "title"]) or {}).get_text(strip=True)
    # Capture first two h2 sections
    sections = []
    for h2 in s.select("h2")[:2]:
        content = []
        for sib in h2.next_siblings:
            if getattr(sib, "name", None) == "h2":
                break
            if getattr(sib, "name", None) in ["p", "ul", "ol", "pre", "code"]:
                content.append(sib.get_text(" ", strip=True)[:500])
        sections.append({"heading": h2.get_text(strip=True), "text": " ".join(content)})
    claims = [{"key": "title", "value": title or url, "conf": 0.9, "sourceUrl": url}]
    for i, sec in enumerate(sections):
        claims.append(
            {
                "key": f"section_{i}",
                "value": f"{sec['heading']}: {sec['text']}",
                "conf": 0.7,
                "sourceUrl": url,
            }
        )
    return claims
