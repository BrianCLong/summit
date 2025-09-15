from __future__ import annotations
import sys
import pathlib

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.pipeline import analyze_batch
from app.schemas import TextItem


def test_confirmation_bias_indicator():
    items = [TextItem(id="1", text="THIS IS ALWAYS TRUE!!!")]
    res = analyze_batch(items)[0]
    conf = {b.type: b.confidence for b in res.bias_indicators}
    assert conf.get("confirmation_framing", 0) >= 0.8


def test_availability_bias_indicator():
    items = [TextItem(id="1", text="Recent news headlines shape opinions")]
    res = analyze_batch(items)[0]
    conf = {b.type: b.confidence for b in res.bias_indicators}
    assert "availability_framing" in conf


def test_anchoring_bias_indicator():
    items = [TextItem(id="1", text="The initial price was 100 but now 50")]
    res = analyze_batch(items)[0]
    conf = {b.type: b.confidence for b in res.bias_indicators}
    assert "anchoring_framing" in conf


def test_bandwagon_bias_indicator():
    items = [TextItem(id="1", text="Everybody is buying this popular trend now")]
    res = analyze_batch(items)[0]
    conf = {b.type: b.confidence for b in res.bias_indicators}
    assert "bandwagon_framing" in conf

