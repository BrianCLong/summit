from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from services.slice_reg.registry import SliceRegistry, SliceVersion


def make_registry(tmp_path: Path) -> SliceRegistry:
    return SliceRegistry(tmp_path)


def test_upsert_and_retrieve_slice(tmp_path: Path) -> None:
    registry = make_registry(tmp_path)
    created_at = datetime(2024, 9, 1, tzinfo=timezone.utc)
    slice_version = SliceVersion(
        name="fairness-spanish",
        version="v1",
        members=["1", "2", "3"],
        metadata={"locale": "es"},
        created_at=created_at,
        source="backtest-2024-09-01",
    )
    registry.upsert(slice_version)

    retrieved = registry.get("fairness-spanish", "v1")
    assert retrieved.members == tuple("123")
    assert retrieved.membership_hash == slice_version.membership_hash
    assert retrieved.provenance_hash == slice_version.provenance_hash
    assert registry.get("fairness-spanish", "v1").as_dict() == slice_version.as_dict()


def test_diff_isolates_membership_changes(tmp_path: Path) -> None:
    registry = make_registry(tmp_path)
    base = SliceVersion(
        name="stress",
        version="v1",
        members=["a", "b", "c"],
        metadata={},
        created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
    )
    candidate = SliceVersion(
        name="stress",
        version="v2",
        members=["b", "c", "d"],
        metadata={},
        created_at=datetime(2024, 1, 2, tzinfo=timezone.utc),
    )
    registry.upsert(base)
    registry.upsert(candidate)

    diff = registry.diff("stress", "v1", "v2")
    assert diff["added"] == ["d"]
    assert diff["removed"] == ["a"]
    assert diff["unchanged"] == ["b", "c"]


def test_coverage_matches_traffic_labels(tmp_path: Path) -> None:
    registry = make_registry(tmp_path)
    slice_version = SliceVersion(
        name="adversarial",
        version="v1",
        members=["1", "3", "5"],
        metadata={"type": "prompt_attack"},
        created_at=datetime(2024, 6, 1, tzinfo=timezone.utc),
    )
    registry.upsert(slice_version)

    traffic = [
        {"id": "1", "label": "toxic", "weight": 2.0},
        {"id": "2", "label": "benign", "weight": 1.0},
        {"id": "3", "label": "toxic", "weight": 1.0},
        {"id": "4", "label": "benign", "weight": 1.0},
        {"id": "5", "label": "jailbreak", "weight": 4.0},
    ]

    coverage = registry.compute_coverage("adversarial", "v1", traffic)
    assert coverage["traffic_total"] == 9.0
    assert coverage["captured_weight"] == 7.0
    assert coverage["coverage"] == 7.0 / 9.0
    assert coverage["label_totals"]["toxic"] == 3.0
    assert coverage["captured_by_label"]["toxic"] == 3.0
    assert coverage["label_coverage"]["toxic"] == 1.0
    assert coverage["label_coverage"]["benign"] == 0.0


def test_provenance_hash_stable_across_member_order(tmp_path: Path) -> None:
    registry = make_registry(tmp_path)
    created_at = datetime(2024, 7, 1, tzinfo=timezone.utc)
    first = SliceVersion(
        name="locale-it",
        version="v1",
        members=["3", "2", "1"],
        metadata={},
        created_at=created_at,
    )
    second = SliceVersion(
        name="locale-it",
        version="v1",
        members=["1", "2", "3"],
        metadata={},
        created_at=created_at,
    )
    registry.upsert(first)
    registry.upsert(second)
    retrieved = registry.get("locale-it", "v1")
    assert retrieved.members == ("1", "2", "3")
    assert retrieved.provenance_hash == first.provenance_hash == second.provenance_hash
