from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

import requests


@dataclass
class PrerClient:
    base_url: str
    default_actor: str | None = None
    session: requests.Session = requests.Session()

    def _url(self, path: str) -> str:
        return f"{self.base_url.rstrip('/')}{path}"

    def create_experiment(
        self, payload: dict[str, Any], actor: str | None = None
    ) -> dict[str, Any]:
        resolved_actor = actor or self._require_actor()
        response = self.session.post(
            self._url("/experiments"), json={**payload, "actor": resolved_actor}, timeout=10
        )
        response.raise_for_status()
        return response.json()

    def start_experiment(self, experiment_id: str, actor: str | None = None) -> dict[str, Any]:
        resolved_actor = actor or self._require_actor()
        response = self.session.post(
            self._url(f"/experiments/{experiment_id}/start"),
            json={"actor": resolved_actor},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    def ingest_result(
        self, experiment_id: str, metric: str, variant: str, value: float, actor: str | None = None
    ) -> dict[str, Any]:
        resolved_actor = actor or self._require_actor()
        response = self.session.post(
            self._url(f"/experiments/{experiment_id}/results"),
            json={
                "metric": metric,
                "variant": variant,
                "value": value,
                "actor": resolved_actor,
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    def export_preregistration(
        self, experiment_id: str, actor: str | None = None
    ) -> dict[str, Any]:
        resolved_actor = actor or self._require_actor()
        response = self.session.post(
            self._url(f"/experiments/{experiment_id}/export"),
            json={"actor": resolved_actor},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    def _require_actor(self) -> str:
        if not self.default_actor:
            raise ValueError("Actor must be provided when no default_actor is set.")
        return self.default_actor
