from intel.pipelines.ingest_techcrunch import extract_text, parse_techcrunch_html


def test_extract_text_strips_scripts() -> None:
    html = """
    <html>
      <head><script>evil()</script></head>
      <body><h1>Title</h1><p>Body text.</p></body>
    </html>
    """
    text = extract_text(html)
    assert "evil" not in text
    assert "Title" in text
    assert "Body text." in text


def test_parse_techcrunch_html_uses_hint() -> None:
    html = "<html><body>Example body.</body></html>"
    article = parse_techcrunch_html(html, title_hint="Hint Title")
    assert article.title == "Hint Title"
    assert "Example body" in article.body_text
