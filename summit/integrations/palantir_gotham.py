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
