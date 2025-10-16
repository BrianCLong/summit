# services/web-agent/tests/test_extractors.py
from extractors import run_extractor

HTML_ARTICLE = """<html><h1>Title</h1><h2>Intro</h2><p>Alpha</p><h2>Usage</h2><p>Bravo</p></html>"""
HTML_FAQ = """<html><h2>What is X?</h2><p>Explanation</p><h2>How use?</h2><p>Steps</p></html>"""
HTML_TABLE = """<table><tr><th>Key</th><th>Val</th></tr><tr><td>A</td><td>B</td></tr></table>"""


def test_article_v2():
    claims = run_extractor("article_v2", HTML_ARTICLE, "u")
    assert any(c["key"] == "section_0" for c in claims)


def test_faq_v1():
    claims = run_extractor("faq_v1", HTML_FAQ, "u")
    assert len([c for c in claims if c["key"] == "faq"]) >= 2


def test_table_v2():
    claims = run_extractor("table_v2", HTML_TABLE, "u")
    assert any(c["key"] == "Key" and "Val" in c["value"] for c in claims)
