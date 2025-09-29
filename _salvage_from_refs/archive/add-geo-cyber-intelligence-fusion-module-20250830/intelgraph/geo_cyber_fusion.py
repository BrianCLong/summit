"""Geo-Cyber intelligence fusion helpers.

This module provides minimal data structures and an in-memory engine
for correlating geospatial events with cyber threat indicators.
It is intentionally lightweight so it can be used in prototypes or
unit tests without requiring external services.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List
import math


@dataclass
class GeoEvent:
    """A real-world event with a location."""

    id: str
    lat: float
    lon: float
    timestamp: datetime
    description: str = ""
    reliability: float = 1.0


@dataclass
class CyberIndicator:
    """A cyber threat indicator with optional geotag."""

    id: str
    lat: float
    lon: float
    timestamp: datetime
    severity: int = 1
    description: str = ""
    reliability: float = 1.0


@dataclass
class Asset:
    """A static location of interest such as infrastructure."""

    id: str
    name: str
    lat: float
    lon: float
    sector: str = ""
    description: str = ""


@dataclass
class CorrelationResult:
    """Result of fusing a :class:`GeoEvent` and :class:`CyberIndicator`."""

    geo_event: GeoEvent
    indicator: CyberIndicator
    distance_km: float
    time_diff: timedelta
    score: float


class GeoCyberFusionEngine:
    """Store and correlate geo and cyber events.

    The engine keeps simple in-memory lists of :class:`GeoEvent` and
    :class:`CyberIndicator` objects.  It can perform time and distance
    based joins to surface potential cross-domain links.
    """

    def __init__(self) -> None:
        self.geo_events: List[GeoEvent] = []
        self.cyber_indicators: List[CyberIndicator] = []
        self.assets: Dict[str, Asset] = {}

    def add_geo_event(self, event: GeoEvent) -> None:
        """Register a geospatial event."""

        self.geo_events.append(event)

    def add_cyber_indicator(self, indicator: CyberIndicator) -> None:
        """Register a cyber threat indicator."""

        self.cyber_indicators.append(indicator)

    def add_asset(self, asset: Asset) -> None:
        """Register a static asset that may be at risk."""

        self.assets[asset.id] = asset

    def correlate(
        self,
        max_km: float = 50.0,
        time_window: timedelta = timedelta(hours=6),
    ) -> List[CorrelationResult]:
        """Return correlation results within the given distance and time window."""

        results: List[CorrelationResult] = []
        for geo_event in self.geo_events:
            for indicator in self.cyber_indicators:
                diff = geo_event.timestamp - indicator.timestamp
                if abs(diff.total_seconds()) <= time_window.total_seconds():
                    dist = _haversine(geo_event.lat, geo_event.lon, indicator.lat, indicator.lon)
                    if dist <= max_km:
                        score = _score(
                            distance_km=dist,
                            time_diff=diff,
                            max_km=max_km,
                            time_window=time_window,
                            severity=indicator.severity,
                            reliability=indicator.reliability * geo_event.reliability,
                        )
                        results.append(
                            CorrelationResult(
                                geo_event=geo_event,
                                indicator=indicator,
                                distance_km=dist,
                                time_diff=abs(diff),
                                score=score,
                            )
                        )
        return results

    def top_correlations(
        self,
        max_results: int = 5,
        min_score: float = 0.0,
        **kwargs,
    ) -> List[CorrelationResult]:
        """Return top scoring correlations sorted descending by score."""

        results = self.correlate(**kwargs)
        filtered = [r for r in results if r.score >= min_score]
        filtered.sort(key=lambda r: r.score, reverse=True)
        return filtered[:max_results]

    def assess_asset_risk(
        self,
        asset_id: str,
        radius_km: float = 50.0,
        time_window: timedelta = timedelta(hours=6),
    ) -> float:
        """Aggregate correlation scores near a registered asset."""

        asset = self.assets.get(asset_id)
        if not asset:
            return 0.0
        risk = 0.0
        for result in self.correlate(max_km=radius_km, time_window=time_window):
            dist_geo = _haversine(asset.lat, asset.lon, result.geo_event.lat, result.geo_event.lon)
            dist_cyber = _haversine(
                asset.lat, asset.lon, result.indicator.lat, result.indicator.lon
            )
            if dist_geo <= radius_km and dist_cyber <= radius_km:
                risk += result.score
        return risk

    def asset_overlays(
        self,
        radius_km: float = 50.0,
        time_window: timedelta = timedelta(hours=6),
    ) -> List[Dict[str, float]]:
        """Return map overlay data for all assets with computed risk."""

        overlays: List[Dict[str, float]] = []
        for asset in self.assets.values():
            risk = self.assess_asset_risk(asset.id, radius_km=radius_km, time_window=time_window)
            overlays.append(
                {
                    "id": asset.id,
                    "name": asset.name,
                    "lat": asset.lat,
                    "lon": asset.lon,
                    "risk": risk,
                }
            )
        return overlays


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points in kilometers."""

    R = 6371.0  # Earth radius in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _score(
    *,
    distance_km: float,
    time_diff: timedelta,
    max_km: float,
    time_window: timedelta,
    severity: int,
    reliability: float,
) -> float:
    """Compute a heuristic correlation score.

    The score scales with severity and reliability and is penalized by
    distance and time difference relative to the supplied thresholds.
    Values are normalized to a 0-`severity` range.
    """

    spatial_factor = max(0.0, 1 - distance_km / max_km)
    temporal_factor = max(0.0, 1 - abs(time_diff.total_seconds()) / time_window.total_seconds())
    return severity * reliability * spatial_factor * temporal_factor
