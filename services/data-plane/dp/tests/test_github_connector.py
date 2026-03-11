"""Tests for the GitHub connector (using respx to mock HTTP)."""
from __future__ import annotations

import json

import httpx
import pytest
import respx

from dp.app.connectors.base import ConnectorSource
from dp.app.connectors.github import GitHubConnector, _parse_next_link


# ---------------------------------------------------------------------------
# _parse_next_link unit tests
# ---------------------------------------------------------------------------

def test_parse_next_link_returns_url():
    header = '<https://api.github.com/repos/acme/api/pulls?page=2>; rel="next", <...>; rel="last"'
    assert _parse_next_link(header) == "https://api.github.com/repos/acme/api/pulls?page=2"


def test_parse_next_link_returns_none_when_absent():
    assert _parse_next_link("") is None
    assert _parse_next_link('<...>; rel="last"') is None


# ---------------------------------------------------------------------------
# GitHubConnector.discover with a pinned repo (no HTTP needed)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_discover_returns_pinned_repo():
    connector = GitHubConnector({"owner": "acme", "repo": "api", "token": "tok"})
    sources = await connector.discover()
    assert len(sources) == 1
    assert sources[0].id == "acme/api"
    assert sources[0].kind == "github_repo"


# ---------------------------------------------------------------------------
# GitHubConnector.pull – PRs, issues, workflow runs
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@respx.mock
async def test_pull_returns_pr_records():
    connector = GitHubConnector(
        {"owner": "acme", "repo": "api", "token": "tok"}
    )
    source = ConnectorSource(
        id="acme/api", name="api", kind="github_repo",
        metadata={"owner": "acme", "repo": "api"},
    )

    pr_payload = [
        {
            "number": 1,
            "title": "feat: auth",
            "state": "open",
            "body": "",
            "user": {"login": "alice", "id": 1},
            "head": {"sha": "abc"},
            "base": {"ref": "main"},
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T01:00:00Z",
            "merged_at": None,
            "closed_at": None,
            "labels": [],
        }
    ]

    respx.get("https://api.github.com/repos/acme/api/pulls").mock(
        return_value=httpx.Response(200, json=pr_payload)
    )
    respx.get("https://api.github.com/repos/acme/api/issues").mock(
        return_value=httpx.Response(200, json=[])
    )
    respx.get("https://api.github.com/repos/acme/api/actions/runs").mock(
        return_value=httpx.Response(200, json={"workflow_runs": []})
    )

    records = [r async for r in connector.pull(source)]

    assert len(records) == 1
    pr = records[0]
    assert pr.record_type == "pull_request"
    assert pr.source_id == "1"
    assert pr.data["author_login"] == "alice"
    assert pr.data["repo"] == "acme/api"


@pytest.mark.asyncio
@respx.mock
async def test_pull_skips_pr_in_issues_endpoint():
    """Issues endpoint returns PRs too; connector must skip them."""
    connector = GitHubConnector({"owner": "acme", "repo": "api", "token": "tok"})
    source = ConnectorSource(
        id="acme/api", name="api", kind="github_repo",
        metadata={"owner": "acme", "repo": "api"},
    )

    # Issue with pull_request key → should be skipped
    issue_with_pr = {
        "number": 2,
        "title": "PR as issue",
        "state": "open",
        "user": {"login": "bob", "id": 2},
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T01:00:00Z",
        "closed_at": None,
        "labels": [],
        "pull_request": {},  # presence of this key means it's a PR
    }
    real_issue = {
        "number": 3,
        "title": "real bug",
        "state": "open",
        "body": "",
        "user": {"login": "carol", "id": 3},
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T01:00:00Z",
        "closed_at": None,
        "labels": [],
    }

    respx.get("https://api.github.com/repos/acme/api/pulls").mock(
        return_value=httpx.Response(200, json=[])
    )
    respx.get("https://api.github.com/repos/acme/api/issues").mock(
        return_value=httpx.Response(200, json=[issue_with_pr, real_issue])
    )
    respx.get("https://api.github.com/repos/acme/api/actions/runs").mock(
        return_value=httpx.Response(200, json={"workflow_runs": []})
    )

    records = [r async for r in connector.pull(source)]

    assert len(records) == 1
    assert records[0].record_type == "issue"
    assert records[0].data["author_login"] == "carol"


@pytest.mark.asyncio
@respx.mock
async def test_health_check_returns_true_on_200():
    connector = GitHubConnector({"owner": "acme", "token": "tok"})
    respx.get("https://api.github.com/rate_limit").mock(
        return_value=httpx.Response(200, json={"rate": {}})
    )
    assert await connector.health_check() is True


@pytest.mark.asyncio
@respx.mock
async def test_health_check_returns_false_on_error():
    connector = GitHubConnector({"owner": "acme", "token": "tok"})
    respx.get("https://api.github.com/rate_limit").mock(
        side_effect=httpx.ConnectError("unreachable")
    )
    assert await connector.health_check() is False
