from __future__ import annotations

from collections.abc import Iterable
from typing import Any

import requests

from ingestion.utils import compute_hash

from .base import Ingestor


class GitHubEventsIngestor(Ingestor):
    """Ingest public GitHub events for one or more repositories."""

    def __init__(self, producer: Any, topic: str, repositories: Iterable[str]):
        super().__init__(producer, topic)
        self.repositories = [repo.strip() for repo in repositories if repo.strip()]

    def fetch(self) -> Iterable[dict[str, Any]]:
        for repository in self.repositories:
            response = requests.get(
                f"https://api.github.com/repos/{repository}/events",
                timeout=10,
                headers={"Accept": "application/vnd.github+json"},
            )
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, list):
                for event in payload:
                    if isinstance(event, dict):
                        yield event

    def normalize(self, item: dict[str, Any]) -> dict[str, Any]:
        repo_name = (item.get("repo") or {}).get("name") if isinstance(item.get("repo"), dict) else None
        return {
            "id": item.get("id") or compute_hash(item),
            "platform": "github",
            "timestamp": item.get("created_at"),
            "text": item.get("type", "GitHubEvent"),
            "metadata": {
                "repo": repo_name,
                "actor": (item.get("actor") or {}).get("login")
                if isinstance(item.get("actor"), dict)
                else None,
                "event_type": item.get("type"),
            },
            "raw": item,
        }
