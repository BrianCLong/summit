import json

import pytest

from connectors.spiderfoot import OsintEvent, write_normalized


def test_determinism(tmp_path):
    events = [
        OsintEvent(type="A", value="1"),
        OsintEvent(type="B", value="2")
    ]

    p1 = tmp_path / "1.json"
    p2 = tmp_path / "2.json"

    write_normalized(events, str(p1))
    write_normalized(events, str(p2))

    assert p1.read_bytes() == p2.read_bytes()
