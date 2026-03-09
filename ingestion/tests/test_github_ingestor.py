from ingestion.ingestors.github_events import GitHubEventsIngestor


def test_github_ingestor_normalize_includes_repo_and_actor() -> None:
    ingestor = GitHubEventsIngestor(
        producer=None,
        topic="raw.posts",
        repositories=["octocat/Hello-World"],
    )
    event = {
        "id": "123",
        "type": "PushEvent",
        "created_at": "2026-01-01T00:00:00Z",
        "repo": {"name": "octocat/Hello-World"},
        "actor": {"login": "octocat"},
    }

    normalized = ingestor.normalize(event)

    assert normalized["id"] == "123"
    assert normalized["platform"] == "github"
    assert normalized["metadata"]["repo"] == "octocat/Hello-World"
    assert normalized["metadata"]["actor"] == "octocat"
