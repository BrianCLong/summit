import sys
from datetime import datetime, timedelta
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from btkg import BTKG  # noqa: E402


def _dt(hours: int) -> datetime:
    base = datetime(2024, 1, 1, 0, 0, 0)
    return base + timedelta(hours=hours)


def test_as_of_queries_are_deterministic():
    graph = BTKG()
    graph.assert_edge(
        "e1",
        "A",
        "B",
        {"type": "knows"},
        valid_from=_dt(0),
        valid_to=_dt(100),
        tx_time=_dt(0),
    )
    graph.assert_edge(
        "e1",
        "A",
        "B",
        {"type": "knows", "confidence": 0.9},
        valid_from=_dt(0),
        valid_to=_dt(100),
        tx_time=_dt(10),
    )

    snap_before = graph.as_of(valid_time=_dt(1), tx_time=_dt(5))
    snap_after = graph.as_of(valid_time=_dt(1), tx_time=_dt(11))

    assert [edge.as_dict() for edge in snap_before.edges] == [
        {
            "edge_id": "e1",
            "source": "A",
            "target": "B",
            "properties": {"type": "knows"},
        }
    ]
    assert [edge.as_dict() for edge in snap_after.edges] == [
        {
            "edge_id": "e1",
            "source": "A",
            "target": "B",
            "properties": {"type": "knows", "confidence": 0.9},
        }
    ]

    diff_a = BTKG.diff(snap_before, snap_after)
    diff_b = BTKG.diff(snap_before, snap_after)
    assert diff_a == diff_b
    assert diff_a.changed_edges and not diff_a.added_edges and not diff_a.removed_edges


def test_isomorphic_hash_considers_structure():
    pytest.importorskip("networkx")

    graph_a = BTKG()
    graph_a.assert_edge(
        "e1",
        "A",
        "B",
        {"type": "knows"},
        valid_from=_dt(0),
        valid_to=_dt(100),
        tx_time=_dt(0),
    )
    graph_a.assert_edge(
        "e2",
        "B",
        "C",
        {"type": "knows"},
        valid_from=_dt(0),
        valid_to=_dt(100),
        tx_time=_dt(0),
    )

    graph_b = BTKG()
    graph_b.assert_edge(
        "x1",
        "X",
        "Y",
        {"type": "knows"},
        valid_from=_dt(0),
        valid_to=_dt(100),
        tx_time=_dt(0),
    )
    graph_b.assert_edge(
        "x2",
        "Y",
        "Z",
        {"type": "knows"},
        valid_from=_dt(0),
        valid_to=_dt(100),
        tx_time=_dt(0),
    )

    snap_a = graph_a.as_of(valid_time=_dt(1), tx_time=_dt(1))
    snap_b = graph_b.as_of(valid_time=_dt(1), tx_time=_dt(1))

    assert snap_a.isomorphic_hash() == snap_b.isomorphic_hash()


def test_parquet_round_trip(tmp_path):
    pytest.importorskip("pyarrow")

    graph = BTKG()
    graph.assert_edge(
        "e1",
        "A",
        "B",
        {"type": "knows"},
        valid_from=_dt(0),
        valid_to=_dt(50),
        tx_time=_dt(0),
    )
    graph.assert_edge(
        "e1",
        "A",
        "B",
        {"type": "knows", "confidence": 0.8},
        valid_from=_dt(0),
        valid_to=_dt(50),
        tx_time=_dt(5),
    )
    graph.assert_edge(
        "e2",
        "B",
        "C",
        {"type": "colleague"},
        valid_from=_dt(0),
        valid_to=_dt(20),
        tx_time=_dt(2),
    )

    path = tmp_path / "graph.parquet"
    graph.export_parquet(path.as_posix())

    loaded = BTKG.from_parquet(path.as_posix())

    original_snap = graph.as_of(valid_time=_dt(3), tx_time=_dt(6))
    loaded_snap = loaded.as_of(valid_time=_dt(3), tx_time=_dt(6))

    assert [edge.as_dict() for edge in original_snap.edges] == [
        {
            "edge_id": "e1",
            "source": "A",
            "target": "B",
            "properties": {"type": "knows", "confidence": 0.8},
        },
        {
            "edge_id": "e2",
            "source": "B",
            "target": "C",
            "properties": {"type": "colleague"},
        },
    ]
    assert [edge.as_dict() for edge in loaded_snap.edges] == [
        {
            "edge_id": "e1",
            "source": "A",
            "target": "B",
            "properties": {"type": "knows", "confidence": 0.8},
        },
        {
            "edge_id": "e2",
            "source": "B",
            "target": "C",
            "properties": {"type": "colleague"},
        },
    ]
