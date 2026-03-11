"""
GitHub connector for the Summit data plane.

Ingests: repositories, pull requests, issues, and CI/CD workflow runs
using the GitHub REST API v3.

Configuration (passed as a dict to __init__):
    token      – GitHub personal access token or app token (required)
    owner      – GitHub org or user name (required)
    repo       – specific repo to scope to (optional; if absent, discover all)
    base_url   – override for GitHub Enterprise (default: https://api.github.com)
    page_size  – items per page (default: 100, max: 100)
"""
from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Any

import httpx

from .base import ConnectorBase, ConnectorRecord, ConnectorSource

logger = logging.getLogger(__name__)

_DEFAULT_BASE = "https://api.github.com"
_DEFAULT_PAGE_SIZE = 100


class GitHubConnector(ConnectorBase):
    """Streams GitHub repos, PRs, issues, and workflow runs as ConnectorRecords."""

    def __init__(self, config: dict[str, Any]) -> None:
        token = config.get("token", "")
        self._owner: str = config["owner"]
        self._repo: str | None = config.get("repo")
        self._base_url: str = config.get("base_url", _DEFAULT_BASE).rstrip("/")
        self._page_size: int = int(config.get("page_size", _DEFAULT_PAGE_SIZE))

        self._headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if token:
            self._headers["Authorization"] = f"Bearer {token}"

    # ------------------------------------------------------------------
    # ConnectorBase API
    # ------------------------------------------------------------------

    async def discover(self) -> list[ConnectorSource]:
        """Return all repos under the configured owner (or just the pinned one)."""
        if self._repo:
            return [
                ConnectorSource(
                    id=f"{self._owner}/{self._repo}",
                    name=self._repo,
                    kind="github_repo",
                    metadata={"owner": self._owner, "repo": self._repo},
                )
            ]

        sources: list[ConnectorSource] = []
        async with httpx.AsyncClient(headers=self._headers) as client:
            async for page in self._paginate(
                client, f"{self._base_url}/orgs/{self._owner}/repos"
            ):
                for repo in page:
                    sources.append(
                        ConnectorSource(
                            id=f"{self._owner}/{repo['name']}",
                            name=repo["name"],
                            kind="github_repo",
                            metadata={
                                "owner": self._owner,
                                "repo": repo["name"],
                                "private": repo.get("private", False),
                                "language": repo.get("language"),
                                "default_branch": repo.get("default_branch", "main"),
                            },
                        )
                    )
        return sources

    async def pull(self, source: ConnectorSource) -> AsyncIterator[ConnectorRecord]:  # type: ignore[override]
        owner = source.metadata.get("owner", self._owner)
        repo = source.metadata.get("repo", source.name)
        async with httpx.AsyncClient(headers=self._headers) as client:
            async for record in self._pull_prs(client, owner, repo):
                yield record
            async for record in self._pull_issues(client, owner, repo):
                yield record
            async for record in self._pull_workflow_runs(client, owner, repo):
                yield record

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(headers=self._headers) as client:
                resp = await client.get(f"{self._base_url}/rate_limit", timeout=5)
                return resp.status_code == 200
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _pull_prs(
        self, client: httpx.AsyncClient, owner: str, repo: str
    ) -> AsyncIterator[ConnectorRecord]:
        url = f"{self._base_url}/repos/{owner}/{repo}/pulls"
        async for page in self._paginate(client, url, params={"state": "all"}):
            for pr in page:
                yield ConnectorRecord(
                    source_id=str(pr["number"]),
                    record_type="pull_request",
                    occurred_at=pr.get("created_at"),
                    data={
                        "number": pr["number"],
                        "title": pr.get("title", ""),
                        "state": pr.get("state", ""),
                        "body": pr.get("body", ""),
                        "author_login": pr.get("user", {}).get("login"),
                        "author_id": pr.get("user", {}).get("id"),
                        "head_sha": pr.get("head", {}).get("sha"),
                        "base_branch": pr.get("base", {}).get("ref"),
                        "created_at": pr.get("created_at"),
                        "updated_at": pr.get("updated_at"),
                        "merged_at": pr.get("merged_at"),
                        "closed_at": pr.get("closed_at"),
                        "repo": f"{owner}/{repo}",
                        "labels": [lb["name"] for lb in pr.get("labels", [])],
                    },
                    metadata={"repo": f"{owner}/{repo}", "kind": "pr"},
                )

    async def _pull_issues(
        self, client: httpx.AsyncClient, owner: str, repo: str
    ) -> AsyncIterator[ConnectorRecord]:
        url = f"{self._base_url}/repos/{owner}/{repo}/issues"
        async for page in self._paginate(
            client, url, params={"state": "all", "filter": "all"}
        ):
            for issue in page:
                # GitHub returns PRs in the issues endpoint; skip them
                if "pull_request" in issue:
                    continue
                yield ConnectorRecord(
                    source_id=str(issue["number"]),
                    record_type="issue",
                    occurred_at=issue.get("created_at"),
                    data={
                        "number": issue["number"],
                        "title": issue.get("title", ""),
                        "state": issue.get("state", ""),
                        "body": issue.get("body", ""),
                        "author_login": issue.get("user", {}).get("login"),
                        "author_id": issue.get("user", {}).get("id"),
                        "created_at": issue.get("created_at"),
                        "updated_at": issue.get("updated_at"),
                        "closed_at": issue.get("closed_at"),
                        "repo": f"{owner}/{repo}",
                        "labels": [lb["name"] for lb in issue.get("labels", [])],
                    },
                    metadata={"repo": f"{owner}/{repo}", "kind": "issue"},
                )

    async def _pull_workflow_runs(
        self, client: httpx.AsyncClient, owner: str, repo: str
    ) -> AsyncIterator[ConnectorRecord]:
        url = f"{self._base_url}/repos/{owner}/{repo}/actions/runs"
        async for page in self._paginate(
            client, url, data_key="workflow_runs"
        ):
            for run in page:
                yield ConnectorRecord(
                    source_id=str(run["id"]),
                    record_type="workflow_run",
                    occurred_at=run.get("created_at"),
                    data={
                        "run_id": run["id"],
                        "workflow_id": run.get("workflow_id"),
                        "name": run.get("name", ""),
                        "status": run.get("status"),
                        "conclusion": run.get("conclusion"),
                        "head_branch": run.get("head_branch"),
                        "head_sha": run.get("head_sha"),
                        "created_at": run.get("created_at"),
                        "updated_at": run.get("updated_at"),
                        "triggering_actor_login": run.get("triggering_actor", {}).get(
                            "login"
                        ),
                        "triggering_actor_id": run.get("triggering_actor", {}).get(
                            "id"
                        ),
                        "repo": f"{owner}/{repo}",
                    },
                    metadata={"repo": f"{owner}/{repo}", "kind": "workflow_run"},
                )

    async def _paginate(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: dict[str, Any] | None = None,
        data_key: str | None = None,
    ) -> AsyncIterator[list[dict[str, Any]]]:
        """
        Follows GitHub's Link header pagination.
        If ``data_key`` is set, unwraps ``response[data_key]`` (e.g. "workflow_runs").
        """
        page_params: dict[str, Any] = {"per_page": self._page_size, **(params or {})}
        next_url: str | None = url

        while next_url:
            try:
                resp = await client.get(next_url, params=page_params, timeout=30)
                resp.raise_for_status()
            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "GitHub API error %s for %s: %s",
                    exc.response.status_code,
                    next_url,
                    exc.response.text[:200],
                )
                return

            body = resp.json()
            items: list[dict[str, Any]] = body[data_key] if data_key else body

            if items:
                yield items

            # Follow pagination via Link header
            link = resp.headers.get("link", "")
            next_url = _parse_next_link(link)
            # After the first request, params are encoded in next_url already
            page_params = {}


def _parse_next_link(link_header: str) -> str | None:
    """Extract the 'next' URL from a GitHub Link header."""
    for part in link_header.split(","):
        part = part.strip()
        if 'rel="next"' in part:
            url_part = part.split(";")[0].strip()
            return url_part.strip("<>")
    return None
