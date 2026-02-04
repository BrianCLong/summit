from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Any
from summit.governance.audit import AuditEvent, emit

@dataclass
class GothamEntity:
    id: str
    type: str
    properties: dict

@dataclass
class GothamEvent:
    id: str
    type: str
    timestamp: str
    description: str

@dataclass
class GothamComment:
    author: str
    content: str
    timestamp: str

@dataclass
class GothamCase:
    case_id: str
    title: str
    entities: List[GothamEntity] = field(default_factory=list)
    events: List[GothamEvent] = field(default_factory=list)
    comments: List[GothamComment] = field(default_factory=list)
    status: str = "OPEN"

class CaseAuditLogger:
    """
    Wraps case modifications with immutable AuditEvents.
    """
    def __init__(self, actor_id: str):
        self.actor_id = actor_id

    def log_case_update(self, case_id: str, action: str, details: dict[str, Any]):
        event = AuditEvent(
            event_type="case_update",
            actor=self.actor_id,
            action=action,
            decision="allow", # Assuming modification is allowed if code reaches here
            metadata={"case_id": case_id, **details}
        )
        emit(event)

    # CRUD wrappers
    def create_case(self, case_id: str, title: str) -> None:
        self.log_case_update(case_id, "create", {"title": title})

    def add_comment(self, case_id: str, content: str) -> None:
        self.log_case_update(case_id, "comment_add", {"content_len": len(content)})

    def close_case(self, case_id: str, reason: str) -> None:
        self.log_case_update(case_id, "status_change", {"new_status": "CLOSED", "reason": reason})

class GothamImporter:
    """
    Imports Gotham Investigation Cases into Summit Graph Traversals.
    """
    def import_case(self, case_json: dict) -> GothamCase:
        entities = [GothamEntity(**e) for e in case_json.get("entities", [])]
        events = [GothamEvent(**e) for e in case_json.get("events", [])]
        comments = [GothamComment(**c) for c in case_json.get("comments", [])]

        return GothamCase(
            case_id=case_json.get("id", "unknown"),
            title=case_json.get("title", "Untitled Case"),
            entities=entities,
            events=events,
            comments=comments,
            status=case_json.get("status", "OPEN")
        )

    def convert_to_traversal(self, case: GothamCase) -> dict:
        """
        Converts a Case into a Summit Graph Traversal (Path).
        """
        # Simplistic conversion: case entities are nodes in the path
        path = {
            "traversal_id": f"TRV-{case.case_id}",
            "nodes": [e.id for e in case.entities],
            "metadata": {
                "source": "gotham_import",
                "original_title": case.title
            }
        }
        return path

@dataclass
class TemporalNode:
    id: str
    valid_from: str
    valid_to: str
    lat: Optional[float] = None
    lon: Optional[float] = None

class TemporalGraphEngine:
    """
    Advanced Gotham Superset: Temporal + Geospatial Graph
    """
    def __init__(self):
        self.nodes: List[TemporalNode] = []

    def add_node(self, node: TemporalNode):
        self.nodes.append(node)

    def find_nearby(self, lat: float, lon: float, radius_km: float, time_point: str) -> List[str]:
        """
        Finds nodes valid at `time_point` within `radius_km` of (lat, lon).
        """
        valid_nodes = []
        for n in self.nodes:
            # 1. Temporal Check
            if not (n.valid_from <= time_point <= n.valid_to):
                continue

            # 2. Geospatial Check (Manhattan distance approximation for speed)
            # 1 deg lat ~ 111km. 1 deg lon ~ 111km * cos(lat)
            if n.lat is None or n.lon is None:
                continue

            d_lat = abs(n.lat - lat) * 111
            d_lon = abs(n.lon - lon) * 111 # simplified

            if d_lat + d_lon <= radius_km:
                valid_nodes.append(n.id)

        return valid_nodes

    def find_pattern(self, pattern_def: str) -> List[List[str]]:
        """
        Mock Pattern Search: "A meets B".
        Returns list of [id_A, id_B] pairs.
        """
        # Simplistic implementation finding any 2 valid nodes
        if len(self.nodes) < 2: return []
        return [[self.nodes[0].id, self.nodes[1].id]]

class HyperGraph:
    """
    Advanced Gotham Superset: Hyperedges + Probabilistic Edges + Time Travel.
    """
    def __init__(self):
        self.snapshots: Dict[str, List[Dict]] = {} # time -> [edges]
        self.entities: Dict[str, set] = {} # canonical_id -> {aliases}

    def add_hyperedge(self, source_ids: List[str], type: str, confidence: float, timestamp: str):
        """
        Records an N-way relationship with confidence.
        """
        edge = {
            "sources": source_ids,
            "type": type,
            "confidence": confidence,
            "timestamp": timestamp
        }
        if timestamp not in self.snapshots:
            self.snapshots[timestamp] = []
        self.snapshots[timestamp].append(edge)

    def resolve_entities(self, raw_name: str) -> str:
        """
        Entity Resolution: Merges similar names.
        """
        # 1. Exact Match
        for canonical, aliases in self.entities.items():
            if raw_name in aliases:
                return canonical

        # 2. Fuzzy Match (Jaro-Winkler mock)
        for canonical in self.entities:
            # Simple substring matching for mock
            if canonical.lower() in raw_name.lower() or raw_name.lower() in canonical.lower():
                self.entities[canonical].add(raw_name)
                return canonical
            # Handle "John S." vs "John Smith"
            if raw_name.endswith(".") and raw_name[:-1].lower() in canonical.lower():
                self.entities[canonical].add(raw_name)
                return canonical

        # 3. Create New
        self.entities[raw_name] = {raw_name}
        return raw_name

    def time_travel_query(self, query_time: str, min_confidence: float = 0.8) -> List[Dict]:
        """
        Returns the graph state as it existed at `query_time`.
        """
        # In a real system, this would be an interval tree
        # Here we just look for exact snapshot or previous
        valid_edges = []
        sorted_times = sorted(self.snapshots.keys())

        target_snapshot = None
        for t in sorted_times:
            if t <= query_time:
                target_snapshot = t
            else:
                break

        if target_snapshot:
            for edge in self.snapshots[target_snapshot]:
                if edge["confidence"] >= min_confidence:
                    valid_edges.append(edge)

        return valid_edges
