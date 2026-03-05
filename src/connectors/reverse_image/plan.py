from __future__ import annotations

TEMPLATES = {
    "bing_images": "https://www.bing.com/images/search?q=imgurl:{MEDIA_URL}&view=detailv2&iss=sbi",
    "google_images": "https://www.google.com/searchbyimage?image_url={MEDIA_URL}",
    "tineye": "https://tineye.com/search?url={MEDIA_URL}",
    "yandex_images": "https://yandex.com/images/search?rpt=imageview&url={MEDIA_URL}",
}


def run(args: dict) -> dict:
    engines = sorted(args.get("engines", []))
    media_url = args.get("media_url", "")
    return {
        "engines": [
            {"engine": engine, "mode": "manual_link", "url_template": TEMPLATES[engine]}
            for engine in engines
        ],
        "media_url": media_url,
        "note": "Manual links only; automated queries are disabled by default.",
    }
