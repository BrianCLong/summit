from ingest.wechat.convert import html_to_markdown_safe


def test_convert_deterministic():
    html = """
    <h1>Title</h1>
    <p>Para <a href="http://link">link</a></p>
    <script>alert(1)</script>
    """
    md = html_to_markdown_safe(html)
    assert "# Title" in md
    assert "Para [link](http://link)" in md
    assert "alert(1)" not in md
