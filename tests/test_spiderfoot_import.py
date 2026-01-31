import json
from pathlib import Path

import pytest

from connectors.spiderfoot import OsintEvent, load_export, normalize, write_normalized


def test_import_minimal():
    export_path = Path("tests/fixtures/spiderfoot/minimal_export.json")
    export = load_export(str(export_path))
    events = normalize(export)

    assert len(events) == 1
    e = events[0]
    assert e.type == "IP_ADDRESS"
    assert e.value == "1.2.3.4"
    assert e.source_module == "sfp_dns"
    assert e.confidence == 100

def test_write_normalized(tmp_path):
    events = [OsintEvent(type="TEST", value="val")]
    out = tmp_path / "out.json"
    write_normalized(events, str(out))

    data = json.loads(out.read_text(encoding="utf-8"))
    assert len(data) == 1
    assert data[0]["type"] == "TEST"
