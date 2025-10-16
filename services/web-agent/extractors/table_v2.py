# services/web-agent/extractors/table_v2.py
from bs4 import BeautifulSoup


def extract_table_v2(html: str, url: str):
    s = BeautifulSoup(html, "html.parser")
    out = []
    for tr in s.select("table tr"):
        tds = [td.get_text(" ", strip=True) for td in tr.find_all(["td", "th"])]
        if len(tds) >= 2:
            out.append(
                {
                    "key": tds[0][:64],
                    "value": " | ".join(tds[1:])[:256],
                    "conf": 0.7,
                    "sourceUrl": url,
                }
            )
    return out[:50]
