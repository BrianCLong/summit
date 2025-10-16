# services/web-agent/extractors/__init__.py (updated)
from .article_v2 import extract_article_v2
from .changelog_v1 import extract_changelog_v1
from .cve_json_v1 import extract_cve_json_v1
from .faq_v1 import extract_faq_v1
from .table_v2 import extract_table_v2


def run_extractor(name: str, payload: str, url: str):
    if name == "article_v2":
        return extract_article_v2(payload, url)
    if name == "faq_v1":
        return extract_faq_v1(payload, url)
    if name == "changelog_v1":
        return extract_changelog_v1(payload, url)
    if name == "cve_json_v1":
        return extract_cve_json_v1(payload, url)
    if name == "table_v2":
        return extract_table_v2(payload, url)
    # fallback to article_v2
    return extract_article_v2(payload, url)
