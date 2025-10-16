# services/web-agent/extractors/faq_v1.py
from bs4 import BeautifulSoup


def extract_faq_v1(html: str, url: str):
    s = BeautifulSoup(html, "html.parser")
    faqs = []
    for q in s.select("h2, h3"):
        ans = []
        for sib in q.next_siblings:
            if getattr(sib, "name", None) in ["h2", "h3"]:
                break
            if getattr(sib, "name", None) in ["p", "ul", "ol"]:
                ans.append(sib.get_text(" ", strip=True))
        if ans:
            faqs.append(
                {
                    "key": "faq",
                    "value": f"{q.get_text(strip=True)} — {' '.join(ans)[:400]}",
                    "conf": 0.65,
                    "sourceUrl": url,
                }
            )
    return faqs[:20]
