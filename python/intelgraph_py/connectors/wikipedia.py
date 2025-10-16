import requests

from ..models import Entity

API = "https://en.wikipedia.org/w/api.php"


def fetch_summary(title: str) -> dict:
    r = requests.get(
        API,
        params={
            "action": "query",
            "prop": "extracts|info",
            "exintro": 1,
            "explaintext": 1,
            "inprop": "url",
            "titles": title,
            "format": "json",
        },
        timeout=20,
    )
    r.raise_for_status()
    pages = r.json().get("query", {}).get("pages", {})
    if not pages:
        return {}
    return next(iter(pages.values()))


def entities_from_summary(title: str) -> list[Entity]:
    page = fetch_summary(title)
    if not page:
        return []
    e = Entity(
        id=f"wiki:{page['pageid']}",
        type="Page",
        props={
            "title": page.get("title"),
            "url": page.get("fullurl"),
            "summary": page.get("extract"),
        },
    )
    return [e]
