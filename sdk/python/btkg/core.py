"""Core implementation for the Bitemporal Knowledge Graph (BTKG)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Iterable, Iterator, List, Mapping, Optional, Sequence, Tuple
import json
from copy import deepcopy

try:  # Optional dependency used for hashing
    import networkx as nx
    from networkx.algorithms.graph_hashing import weisfeiler_lehman_graph_hash
except ImportError as exc:  # pragma: no cover - exercised in tests via skip
    nx = None  # type: ignore
    weisfeiler_lehman_graph_hash = None  # type: ignore
    NETWORKX_IMPORT_ERROR = exc
else:
    NETWORKX_IMPORT_ERROR = None


@dataclass
class EdgeVersion:
    """Concrete version of a bitemporal edge."""

    edge_id: str
    source: str
    target: str
    properties: Dict[str, object]
    valid_start: datetime
    valid_end: Optional[datetime]
    tx_start: datetime
    tx_end: Optional[datetime] = None

    def is_valid(self, valid_time: datetime, tx_time: datetime) -> bool:
        """Return ``True`` when the version is active for the provided times."""
        return _contains(self.valid_start, self.valid_end, valid_time) and _contains(
            self.tx_start, self.tx_end, tx_time
        )

    def close(self, tx_time: datetime) -> None:
        """Close the transactional window for the version."""
        if self.tx_end is None or tx_time < self.tx_end:
            self.tx_end = tx_time

    def to_snapshot_edge(self) -> "SnapshotEdge":
        return SnapshotEdge(
            edge_id=self.edge_id,
            source=self.source,
            target=self.target,
            properties=tuple(sorted(deepcopy(self.properties).items())),
        )

    def to_record(self) -> Dict[str, object]:
        """Serialize the version for persistence."""
        return {
            "edge_id": self.edge_id,
            "source": self.source,
            "target": self.target,
            "properties": json.dumps(self.properties, sort_keys=True),
            "valid_start": self.valid_start.isoformat(),
            "valid_end": self.valid_end.isoformat() if self.valid_end else None,
            "tx_start": self.tx_start.isoformat(),
            "tx_end": self.tx_end.isoformat() if self.tx_end else None,
        }

    @staticmethod
    def from_record(record: Mapping[str, object]) -> "EdgeVersion":
        """Create a version from serialized state."""
        return EdgeVersion(
            edge_id=str(record["edge_id"]),
            source=str(record["source"]),
            target=str(record["target"]),
            properties=json.loads(str(record["properties"])),
            valid_start=_parse_datetime(record["valid_start"]),
            valid_end=_parse_datetime(record.get("valid_end")),
            tx_start=_parse_datetime(record["tx_start"]),
            tx_end=_parse_datetime(record.get("tx_end")),
        )


@dataclass(frozen=True)
class SnapshotEdge:
    """Immutable representation of an edge inside a snapshot."""

    edge_id: str
    source: str
    target: str
    properties: Tuple[Tuple[str, object], ...]

    def as_dict(self) -> Dict[str, object]:
        return {
            "edge_id": self.edge_id,
            "source": self.source,
            "target": self.target,
            "properties": {k: v for k, v in self.properties},
        }

    def canonical(self) -> Tuple[str, str, Tuple[Tuple[str, object], ...]]:
        return (self.source, self.target, self.properties)


@dataclass(frozen=True)
class GraphDiff:
    """Deterministic diff between two graph snapshots."""

    added_edges: Tuple[SnapshotEdge, ...]
    removed_edges: Tuple[SnapshotEdge, ...]
    changed_edges: Tuple[Tuple[SnapshotEdge, SnapshotEdge], ...]


class GraphSnapshot:
    """Read-only view of a graph at a specific bitemporal point."""

    def __init__(self, edges: Sequence[SnapshotEdge]):
        self._edges: Tuple[SnapshotEdge, ...] = tuple(sorted(edges, key=lambda e: e.edge_id))
        self._nodes: Tuple[str, ...] = tuple(sorted({n for e in self._edges for n in (e.source, e.target)}))

    @property
    def edges(self) -> Tuple[SnapshotEdge, ...]:
        return self._edges

    @property
    def nodes(self) -> Tuple[str, ...]:
        return self._nodes

    def edge_map(self) -> Dict[str, SnapshotEdge]:
        return {edge.edge_id: edge for edge in self._edges}

    def isomorphic_hash(self) -> str:
        """Return a hash that is identical for isomorphic graphs."""
        if NETWORKX_IMPORT_ERROR is not None:  # pragma: no cover - handled in tests
            raise NETWORKX_IMPORT_ERROR

        graph = nx.DiGraph()
        graph.add_nodes_from(self._nodes)
        for edge in self._edges:
            graph.add_edge(
                edge.source,
                edge.target,
                edge_id=edge.edge_id,
                properties=json.dumps({k: v for k, v in edge.properties}, sort_keys=True),
            )
        return weisfeiler_lehman_graph_hash(graph, edge_attr="properties")

    def __iter__(self) -> Iterator[SnapshotEdge]:
        return iter(self._edges)


class BTKG:
    """In-memory bitemporal property graph store."""

    def __init__(self) -> None:
        self._edge_versions: Dict[str, List[EdgeVersion]] = {}

    def assert_edge(
        self,
        edge_id: str,
        source: str,
        target: str,
        properties: Mapping[str, object],
        valid_from: datetime,
        valid_to: Optional[datetime] = None,
        *,
        tx_time: Optional[datetime] = None,
    ) -> None:
        """Assert or correct an edge over a validity interval."""
        tx_time = tx_time or datetime.utcnow()
        version = EdgeVersion(
            edge_id=edge_id,
            source=source,
            target=target,
            properties=deepcopy(dict(properties)),
            valid_start=valid_from,
            valid_end=valid_to,
            tx_start=tx_time,
        )

        versions = self._edge_versions.setdefault(edge_id, [])
        for existing in versions:
            if existing.tx_end is None:
                existing.close(tx_time)
        versions.append(version)

    def as_of(self, valid_time: datetime, tx_time: datetime) -> GraphSnapshot:
        """Return the graph snapshot as of the provided valid and transaction times."""
        edges: List[SnapshotEdge] = []
        for versions in self._edge_versions.values():
            for version in versions:
                if version.is_valid(valid_time, tx_time):
                    edges.append(version.to_snapshot_edge())
        return GraphSnapshot(edges)

    @staticmethod
    def diff(a: GraphSnapshot, b: GraphSnapshot) -> GraphDiff:
        """Return a deterministic diff between two snapshots."""
        a_map = a.edge_map()
        b_map = b.edge_map()

        added_ids = sorted(set(b_map) - set(a_map))
        removed_ids = sorted(set(a_map) - set(b_map))
        changed_ids = sorted(
            edge_id
            for edge_id in set(a_map).intersection(b_map)
            if a_map[edge_id].canonical() != b_map[edge_id].canonical()
        )

        added = tuple(b_map[i] for i in added_ids)
        removed = tuple(a_map[i] for i in removed_ids)
        changed = tuple((a_map[i], b_map[i]) for i in changed_ids)
        return GraphDiff(added_edges=added, removed_edges=removed, changed_edges=changed)

    def export_parquet(self, path: str) -> None:
        """Write the graph history to a Parquet file."""
        table = _versions_to_parquet(self.iter_versions())
        if table is None:
            return
        import pyarrow.parquet as pq  # Local import to defer dependency

        pq.write_table(table, path)

    @classmethod
    def from_parquet(cls, path: str) -> "BTKG":
        """Restore a graph from a Parquet file."""
        import pyarrow.parquet as pq

        table = pq.read_table(path)
        graph = cls()
        for record in table.to_pylist():
            version = EdgeVersion.from_record(record)
            graph._edge_versions.setdefault(version.edge_id, []).append(version)
        # Ensure versions are ordered chronologically for determinism
        for versions in graph._edge_versions.values():
            versions.sort(key=lambda v: (v.tx_start, v.valid_start))
        return graph

    def iter_versions(self) -> Iterable[EdgeVersion]:
        for versions in self._edge_versions.values():
            yield from versions


def _contains(start: datetime, end: Optional[datetime], value: datetime) -> bool:
    return start <= value and (end is None or value < end)


def _parse_datetime(value: Optional[object]) -> Optional[datetime]:
    if value in (None, "", "null"):
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, bytes):
        value = value.decode("utf-8")
    return datetime.fromisoformat(str(value))


def _versions_to_parquet(versions: Iterable[EdgeVersion]):
    import pyarrow as pa

    rows = [version.to_record() for version in versions]
    if not rows:
        return None
    return pa.Table.from_pylist(rows)
