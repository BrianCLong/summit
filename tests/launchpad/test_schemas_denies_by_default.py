import pytest

from modules.launchpad.validate import validate_agent, validate_project

VALID_AGENT = {
    "agent_id": "agent-1",
    "display_name": "Agent One",
    "pubkey": "A" * 64,
}

VALID_PROJECT = {
    "project_id": "proj-1",
    "agent_id": "agent-1",
    "title": "Launchpad Project",
    "tagline": "Agent-built project with strict validation.",
    "category": "discovery",
    "links": ["https://example.com"],
    "submitted_day": "2026-02-03",
}


def test_rejects_missing_required_fields():
    with pytest.raises(ValueError):
        validate_agent({"agent_id": "agent-1"})


@pytest.mark.parametrize(
    "bad_link",
    [
        "http://example.com",
        "javascript:alert(1)",
        "data:text/plain,evil",
        "file:///etc/passwd",
    ],
)
def test_rejects_non_https_links(bad_link):
    payload = dict(VALID_PROJECT)
    payload["links"] = [bad_link]
    with pytest.raises(ValueError):
        validate_project(payload)


def test_rejects_overlong_title_and_tagline():
    payload = dict(VALID_PROJECT)
    payload["title"] = "T" * 81
    payload["tagline"] = "L" * 141
    with pytest.raises(ValueError):
        validate_project(payload)
