from __future__ import annotations

import json
import os
import sys
import threading
from datetime import datetime, timedelta
from http.client import HTTPConnection

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest

from analytics_layer import (
    DataFusionPipeline,
    ExplainableMetricsEngine,
    ExternalMeasurement,
    InternalSignal,
    RealTimeThreatIndexCalculator,
    ThreatIndexService,
    WorldEventTrigger,
    create_http_server,
)


@pytest.fixture
def sample_data():
    base_time = datetime(2024, 1, 1, 12, 0, 0)
    external = [
        ExternalMeasurement(
            domain="example.com", timestamp=base_time, reach=0.8, amplification=0.7, sentiment=0.1
        ),
        ExternalMeasurement(
            domain="example.com",
            timestamp=base_time + timedelta(minutes=5),
            reach=0.9,
            amplification=0.6,
            sentiment=0.05,
        ),
    ]
    internal = [
        InternalSignal(
            domain="example.com",
            timestamp=base_time + timedelta(minutes=2),
            user_growth=0.4,
            suspicious_activity=0.6,
            platform_health=0.5,
        ),
    ]
    events = [
        WorldEventTrigger(
            domain="example.com",
            timestamp=base_time + timedelta(minutes=3),
            severity=0.9,
            relevance=0.8,
        )
    ]
    return external, internal, events


def test_pipeline_generates_snapshot(sample_data):
    external, internal, events = sample_data
    pipeline = DataFusionPipeline()

    snapshot = pipeline.fuse(external, internal, events)

    assert snapshot.domain == "example.com"
    assert snapshot.influence_score >= 0
    assert snapshot.anomaly_score <= 1
    assert snapshot.features["sample_size"] == len(external) + len(internal) + len(events)


def test_metrics_engine_tracks_history(sample_data):
    external, internal, events = sample_data
    pipeline = DataFusionPipeline()
    engine = ExplainableMetricsEngine(history_window=10)

    first_snapshot = pipeline.fuse(external, internal, events)
    metrics_first = engine.compute(first_snapshot)

    follow_up = pipeline.fuse(
        [
            ExternalMeasurement(
                domain="example.com",
                timestamp=external[-1].timestamp + timedelta(minutes=10),
                reach=0.95,
                amplification=0.75,
                sentiment=0.0,
            )
        ],
        internal,
        events,
    )
    metrics_second = engine.compute(follow_up)

    assert metrics_first.influence_velocity == pytest.approx(first_snapshot.influence_score)
    assert metrics_second.influence_velocity != 0
    assert len(engine.history) == 2


def test_threat_index_updates(sample_data):
    external, internal, events = sample_data
    pipeline = DataFusionPipeline()
    engine = ExplainableMetricsEngine(history_window=5)
    calculator = RealTimeThreatIndexCalculator(decay=0.5)

    snapshot = pipeline.fuse(external, internal, events)
    metrics = engine.compute(snapshot)
    state = calculator.update(snapshot, metrics)

    assert 0 <= state.value <= 100
    assert 0 <= state.confidence <= 1

    snapshot2 = pipeline.fuse(
        [
            ExternalMeasurement(
                domain="example.com",
                timestamp=snapshot.timestamp + timedelta(minutes=10),
                reach=0.6,
                amplification=0.5,
                sentiment=-0.1,
            )
        ],
        internal,
        events,
    )
    metrics2 = engine.compute(snapshot2)
    state2 = calculator.update(snapshot2, metrics2)

    assert calculator.history[-1] == state2
    assert state2.value != state.value


def test_service_returns_serializable_payload(sample_data):
    external, internal, events = sample_data
    service = ThreatIndexService()

    payload = {
        "external_measurements": [
            {
                "domain": item.domain,
                "timestamp": item.timestamp.isoformat(),
                "reach": item.reach,
                "amplification": item.amplification,
                "sentiment": item.sentiment,
            }
            for item in external
        ],
        "internal_signals": [
            {
                "domain": item.domain,
                "timestamp": item.timestamp.isoformat(),
                "user_growth": item.user_growth,
                "suspicious_activity": item.suspicious_activity,
                "platform_health": item.platform_health,
            }
            for item in internal
        ],
        "world_events": [
            {
                "domain": item.domain,
                "timestamp": item.timestamp.isoformat(),
                "severity": item.severity,
                "relevance": item.relevance,
            }
            for item in events
        ],
    }

    response = service.compute_from_payload(payload)

    assert 0 <= response.threat_index <= 100
    assert set(response.metrics.keys()) == {
        "influence_velocity",
        "anomaly_clustering",
        "behavioral_drift",
        "event_pressure",
    }


def test_http_api_round_trip(sample_data):
    external, internal, events = sample_data
    payload = {
        "external_measurements": [
            {
                "domain": item.domain,
                "timestamp": item.timestamp.isoformat(),
                "reach": item.reach,
                "amplification": item.amplification,
                "sentiment": item.sentiment,
            }
            for item in external
        ],
        "internal_signals": [
            {
                "domain": item.domain,
                "timestamp": item.timestamp.isoformat(),
                "user_growth": item.user_growth,
                "suspicious_activity": item.suspicious_activity,
                "platform_health": item.platform_health,
            }
            for item in internal
        ],
        "world_events": [
            {
                "domain": item.domain,
                "timestamp": item.timestamp.isoformat(),
                "severity": item.severity,
                "relevance": item.relevance,
            }
            for item in events
        ],
    }

    server = create_http_server(host="127.0.0.1", port=0)
    host, port = server.server_address

    thread = threading.Thread(target=server.serve_forever)
    thread.daemon = True
    thread.start()

    try:
        connection = HTTPConnection(host, port, timeout=5)
        connection.request(
            "POST",
            "/threat-index",
            body=json.dumps(payload),
            headers={"Content-Type": "application/json"},
        )
        response = connection.getresponse()
        body = response.read().decode("utf-8")
        assert response.status == 200
        payload = json.loads(body)
        assert "threat_index" in payload
        assert "metrics" in payload
    finally:
        server.shutdown()
        thread.join()
