"""Core slice registry domain models and storage helpers.

The registry stores named, versioned data slices with frozen membership and
provenance hashes. Slices are serialized canonically so that they are
reproducible byte-for-byte across environments.
"""
from __future__ import annotations

import json
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Dict, Iterable, List, Mapping, MutableMapping, Optional, Sequence


@dataclass(frozen=True)
class SliceVersion:
    """Immutable representation of a slice version."""

    name: str
    version: str
    members: Sequence[str]
    metadata: Mapping[str, object]
    created_at: datetime
    source: Optional[str] = None
    provenance_hash: str = field(init=False)
    membership_hash: str = field(init=False)

    def __post_init__(self) -> None:
        canonical_members = tuple(sorted(dict.fromkeys(self.members)))
        object.__setattr__(self, "members", canonical_members)
        object.__setattr__(self, "membership_hash", _hash_members(canonical_members))
        object.__setattr__(
            self,
            "provenance_hash",
            _hash_payload(
                {
                    "name": self.name,
                    "version": self.version,
                    "members": canonical_members,
                    "metadata": dict(sorted(self.metadata.items())),
                    "created_at": self.created_at.replace(microsecond=0, tzinfo=timezone.utc).isoformat(),
                    "source": self.source,
                    "membership_hash": _hash_members(canonical_members),
                }
            ),
        )

    def as_dict(self) -> Dict[str, object]:
        return {
            "name": self.name,
            "version": self.version,
            "members": list(self.members),
            "metadata": dict(self.metadata),
            "created_at": self.created_at.replace(microsecond=0, tzinfo=timezone.utc).isoformat(),
            "source": self.source,
            "membership_hash": self.membership_hash,
            "provenance_hash": self.provenance_hash,
            "cardinality": len(self.members),
        }


class SliceRegistry:
    """File-backed registry for versioned evaluation slices."""

    def __init__(self, storage_dir: Path) -> None:
        self._storage_dir = storage_dir
        self._storage_dir.mkdir(parents=True, exist_ok=True)
        self._store_path = self._storage_dir / "slices.json"
        self._lock = threading.Lock()
        if not self._store_path.exists():
            self._write_store({"slices": {}})

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def upsert(self, slice_version: SliceVersion) -> SliceVersion:
        with self._lock:
            store = self._read_store()
            slices: MutableMapping[str, MutableMapping[str, object]] = store.setdefault("slices", {})
            versions: MutableMapping[str, object] = slices.setdefault(slice_version.name, {})
            versions[slice_version.version] = slice_version.as_dict()
            self._write_store(store)
        return slice_version

    def get(self, name: str, version: str) -> SliceVersion:
        with self._lock:
            store = self._read_store()
        try:
            payload = store["slices"][name][version]
        except KeyError as exc:  # pragma: no cover - defensive
            raise KeyError(f"Slice {name}@{version} not found") from exc
        return _slice_from_payload(payload)

    def list_versions(self, name: str) -> List[SliceVersion]:
        with self._lock:
            store = self._read_store()
        versions = store.get("slices", {}).get(name, {})
        return [
            _slice_from_payload(payload)
            for _, payload in sorted(versions.items(), key=lambda item: item[0])
        ]

    def diff(self, name: str, baseline: str, candidate: str) -> Dict[str, List[str]]:
        baseline_slice = self.get(name, baseline)
        candidate_slice = self.get(name, candidate)
        base_members = set(baseline_slice.members)
        candidate_members = set(candidate_slice.members)
        added = sorted(candidate_members - base_members)
        removed = sorted(base_members - candidate_members)
        unchanged = sorted(base_members & candidate_members)
        return {
            "slice": name,
            "baseline": baseline,
            "candidate": candidate,
            "added": added,
            "removed": removed,
            "unchanged": unchanged,
        }

    def compute_coverage(
        self, name: str, version: str, traffic_events: Iterable[Mapping[str, object]]
    ) -> Dict[str, object]:
        slice_version = self.get(name, version)
        members = set(slice_version.members)
        total_weight = 0.0
        slice_weight = 0.0
        total_by_label: Dict[str, float] = {}
        captured_by_label: Dict[str, float] = {}

        for event in traffic_events:
            identifier = str(event["id"])
            label = str(event.get("label", "unknown"))
            weight = float(event.get("weight", 1.0))
            total_weight += weight
            total_by_label[label] = total_by_label.get(label, 0.0) + weight
            if identifier in members:
                slice_weight += weight
                captured_by_label[label] = captured_by_label.get(label, 0.0) + weight

        coverage = slice_weight / total_weight if total_weight else 0.0
        label_coverage = {
            label: (captured_by_label.get(label, 0.0) / total if total else 0.0)
            for label, total in total_by_label.items()
        }
        return {
            "slice": slice_version.as_dict(),
            "traffic_total": total_weight,
            "captured_weight": slice_weight,
            "coverage": coverage,
            "label_totals": total_by_label,
            "captured_by_label": captured_by_label,
            "label_coverage": label_coverage,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _read_store(self) -> Dict[str, object]:
        if not self._store_path.exists():
            return {"slices": {}}
        with self._store_path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _write_store(self, payload: Mapping[str, object]) -> None:
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        with self._store_path.open("w", encoding="utf-8") as handle:
            handle.write(canonical)


# ----------------------------------------------------------------------
# Helper functions
# ----------------------------------------------------------------------

def _hash_payload(payload: Mapping[str, object]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return sha256(canonical.encode("utf-8")).hexdigest()


def _hash_members(members: Sequence[str]) -> str:
    canonical = json.dumps(list(members), separators=(",", ":"))
    return sha256(canonical.encode("utf-8")).hexdigest()


def _slice_from_payload(payload: Mapping[str, object]) -> SliceVersion:
    return SliceVersion(
        name=str(payload["name"]),
        version=str(payload["version"]),
        members=list(payload["members"]),
        metadata=dict(payload.get("metadata", {})),
        created_at=datetime.fromisoformat(str(payload["created_at"])),
        source=payload.get("source"),
    )
