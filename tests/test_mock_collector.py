import os

import pytest

from agentic_web_visibility.collectors.mock import MockCollector
from agentic_web_visibility.policy.schema_validate import validate_event

FIXTURES_PATH = os.path.join(os.path.dirname(__file__), '../fixtures/agentic_web_visibility/mock_sessions.jsonl')

def test_mock_collector_output():
    collector = MockCollector(FIXTURES_PATH)
    events = list(collector.collect())
    assert len(events) > 0
    for event in events:
        assert validate_event(event)
