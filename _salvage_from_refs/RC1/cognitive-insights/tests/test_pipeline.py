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