import pathlib
import sys
from datetime import datetime, timedelta

sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))

from intelgraph.geo_cyber_fusion import (
    GeoEvent,
    CyberIndicator,
    GeoCyberFusionEngine,
    Asset,
)


def test_correlate_events():
    engine = GeoCyberFusionEngine()
    now = datetime.utcnow()
    geo = GeoEvent(id="g1", lat=50.0, lon=30.0, timestamp=now)
    near_cyber = CyberIndicator(id="c1", lat=50.1, lon=30.1, timestamp=now)
    far_cyber = CyberIndicator(id="c2", lat=0.0, lon=0.0, timestamp=now)
    engine.add_geo_event(geo)
    engine.add_cyber_indicator(near_cyber)
    engine.add_cyber_indicator(far_cyber)
    correlations = engine.correlate(max_km=15, time_window=timedelta(hours=1))
    assert len(correlations) == 1
    result = correlations[0]
    assert result.geo_event == geo
    assert result.indicator == near_cyber
    assert result.score > 0


def test_top_correlations_filters_and_sorts():
    engine = GeoCyberFusionEngine()
    now = datetime.utcnow()
    geo = GeoEvent(id="g1", lat=40.0, lon=40.0, timestamp=now)
    ind_a = CyberIndicator(id="c1", lat=40.05, lon=40.05, timestamp=now, severity=5)
    ind_b = CyberIndicator(
        id="c2",
        lat=40.2,
        lon=40.2,
        timestamp=now - timedelta(hours=5),
        severity=10,
    )
    engine.add_geo_event(geo)
    engine.add_cyber_indicator(ind_a)
    engine.add_cyber_indicator(ind_b)

    top = engine.top_correlations(min_score=1.0, max_results=2)
    assert len(top) == 1
    assert top[0].indicator == ind_a


def test_asset_risk_and_overlays():
    engine = GeoCyberFusionEngine()
    now = datetime.utcnow()
    asset = Asset(id="a1", name="Plant", lat=0.0, lon=0.0, sector="energy")
    engine.add_asset(asset)
    geo = GeoEvent(id="g1", lat=0.0, lon=0.0, timestamp=now)
    ind = CyberIndicator(id="c1", lat=0.1, lon=0.0, timestamp=now, severity=5)
    engine.add_geo_event(geo)
    engine.add_cyber_indicator(ind)

    risk = engine.assess_asset_risk("a1", radius_km=20, time_window=timedelta(hours=1))
    assert risk > 0

    overlays = engine.asset_overlays(radius_km=20, time_window=timedelta(hours=1))
    assert overlays[0]["risk"] == risk
