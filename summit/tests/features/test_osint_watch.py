import pytest
from summit.features.osint_watch.engine import parse_markdown, generate_stamp

def test_parse_markdown():
    content = """
## Section 1
Content of section 1.

## Section 2
Content of section 2.
"""
    result = parse_markdown(content)
    sections = result["sections"]
    assert "Section 1" in sections
    assert "Section 2" in sections
    assert "Content of section 1." in sections["Section 1"]
    assert "Content of section 2." in sections["Section 2"]

def test_generate_stamp():
    content = "some content"
    stamp = generate_stamp(content)
    assert "hash" in stamp
    assert stamp["algorithm"] == "sha256"
