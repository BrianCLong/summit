from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

import httpx


@dataclass
class PlantTokenRequest:
  type: str
  planted_by: str
  source_system: str
  ttl_seconds: int
  tags: Optional[list[str]] = None
  metadata: Optional[Dict[str, Any]] = None


@dataclass
class PlantTokenResponse:
  id: str
  token_value: str
  token_type: str
  display_name: str
  expires_at: str
  leak_score: float


@dataclass
class CallbackEventRequest:
  token_value: str
  channel: str
  source_address: Optional[str] = None
  context: Optional[Dict[str, Any]] = None


@dataclass
class DashboardResponse:
  totals: Dict[str, int]
  tokens_by_type: Dict[str, int]
  top_alerts: list[Dict[str, Any]]
  recent_activity: list[Dict[str, Any]]


class CTPTClient:
  """Client for the Canary Token Planting & Traceback service."""

  def __init__(
    self,
    base_url: str,
    api_key: Optional[str] = None,
    transport: Optional[httpx.BaseTransport] = None,
    timeout: Optional[float] = 10.0,
    client_factory: Callable[..., httpx.Client] = httpx.Client,
  ) -> None:
    self._base_url = base_url.rstrip('/')
    self._api_key = api_key
    self._client_factory = client_factory
    self._client_kwargs: Dict[str, Any] = {
      'base_url': self._base_url,
      'timeout': timeout,
    }
    if transport is not None:
      self._client_kwargs['transport'] = transport

  def _headers(self) -> Dict[str, str]:
    headers = {'content-type': 'application/json'}
    if self._api_key:
      headers['authorization'] = f'Bearer {self._api_key}'
    return headers

  def plant_token(self, request: PlantTokenRequest) -> PlantTokenResponse:
    payload = {
      'type': request.type,
      'plantedBy': request.planted_by,
      'sourceSystem': request.source_system,
      'ttlSeconds': request.ttl_seconds,
      'tags': request.tags,
      'metadata': request.metadata,
    }
    with self._client_factory(**self._client_kwargs) as client:
      response = client.post('/ctpt/tokens', json=payload, headers=self._headers())
      response.raise_for_status()
      data = response.json()
      return PlantTokenResponse(
        id=data['id'],
        token_value=data['tokenValue'],
        token_type=data['tokenType'],
        display_name=data['displayName'],
        expires_at=data['expiresAt'],
        leak_score=float(data['leakScore']),
      )

  def record_callback(self, request: CallbackEventRequest) -> None:
    payload = {
      'tokenValue': request.token_value,
      'channel': request.channel,
      'sourceAddress': request.source_address,
      'context': request.context,
    }
    with self._client_factory(**self._client_kwargs) as client:
      response = client.post('/ctpt/callbacks', json=payload, headers=self._headers())
      response.raise_for_status()

  def get_dashboard(self) -> DashboardResponse:
    with self._client_factory(**self._client_kwargs) as client:
      response = client.get('/ctpt/dashboard', headers=self._headers())
      response.raise_for_status()
      data = response.json()
      return DashboardResponse(
        totals=data['totals'],
        tokens_by_type=data['tokensByType'],
        top_alerts=data['topAlerts'],
        recent_activity=data['recentActivity'],
      )


__all__ = [
  'CTPTClient',
  'CallbackEventRequest',
  'DashboardResponse',
  'PlantTokenRequest',
  'PlantTokenResponse',
]
