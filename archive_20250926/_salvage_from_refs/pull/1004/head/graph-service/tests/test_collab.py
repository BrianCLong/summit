import asyncio
import time
import sys
import pathlib

import pytest

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
import collab


@pytest.mark.asyncio
async def test_emit_change_metadata(monkeypatch):
    captured = {}

    async def fake_emit(event, data):
        captured["event"] = event
        captured["data"] = data

    monkeypatch.setattr(collab.sio, "emit", fake_emit)
    await collab.emit_change("add_node", {"id": 1}, "alice")
    assert captured["event"] == "graph_change"
    assert captured["data"]["user"] == "alice"
    assert captured["data"]["action"] == "add_node"


@pytest.mark.asyncio
async def test_emit_change_debounce(monkeypatch):
    times = []

    async def fake_emit(event, data):
        times.append(time.time())

    monkeypatch.setattr(collab.sio, "emit", fake_emit)
    await collab.emit_change("update", {}, "u1")
    await collab.emit_change("update", {}, "u1")
    assert times[1] - times[0] >= collab._DEBOUNCE_WINDOW
