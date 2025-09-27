"""Client for interacting with the Consent-Compliant Messaging Orchestrator (CCMO)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import httpx


@dataclass
class ConsentPayload:
    subject_id: str
    topic: str
    purpose: str
    allowed: bool
    locales: Optional[List[str]] = None


@dataclass
class NotificationPayload:
    subject_id: str
    topic: str
    purpose: str
    channel: str
    locale: str
    template: str
    dark_mode: bool = False
    data: Optional[Dict[str, Any]] = None


class CCMOClient:
    """Synchronous wrapper around the CCMO HTTP API."""

    def __init__(self, base_url: str, *, timeout: float = 10.0) -> None:
        self._client = httpx.Client(base_url=base_url.rstrip('/'), timeout=timeout)

    def close(self) -> None:
        self._client.close()

    def set_consent(self, payload: ConsentPayload) -> None:
        locales = payload.locales or []
        response = self._client.post(
            '/consents',
            json={
                'subjectId': payload.subject_id,
                'topic': payload.topic,
                'purpose': payload.purpose,
                'allowed': payload.allowed,
                'locales': locales,
            },
        )
        response.raise_for_status()

    def send_notification(self, payload: NotificationPayload) -> Dict[str, Any]:
        response = self._client.post(
            '/notifications/send',
            json={
                'subjectId': payload.subject_id,
                'topic': payload.topic,
                'purpose': payload.purpose,
                'channel': payload.channel,
                'locale': payload.locale,
                'template': payload.template,
                'darkMode': payload.dark_mode,
                'data': payload.data or {},
            },
        )
        response.raise_for_status()
        return response.json()

    def get_appeals(self) -> List[Dict[str, Any]]:
        response = self._client.get('/appeals')
        response.raise_for_status()
        return response.json()

    def __enter__(self) -> "CCMOClient":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()
