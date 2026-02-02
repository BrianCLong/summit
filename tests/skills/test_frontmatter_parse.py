import pytest
from summit.skills.frontmatter import split_frontmatter, normalize_frontmatter

def test_no_frontmatter():
    fm, body = split_frontmatter("# Hello\nBody")
    assert fm == {}
    assert "Hello" in body

def test_requires_name_description():
    fm, _ = split_frontmatter("---\nname: x\n---\nBody")
    with pytest.raises(ValueError):
        normalize_frontmatter(fm)

def test_valid_frontmatter():
    fm, body = split_frontmatter("---\nname: my-skill\ndescription: A great skill\n---\nBody")
    sfm = normalize_frontmatter(fm)
    assert sfm.name == "my-skill"
    assert sfm.description == "A great skill"
    assert "Body" in body
