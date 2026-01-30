import datetime
from typing import Any, Dict

import prov.model


class ProvenanceExporter:
    def __init__(self, namespace_uri="http://summit.example.org/"):
        self.doc = prov.model.ProvDocument()
        self.doc.set_default_namespace(namespace_uri)
        self.doc.add_namespace("prov", "http://www.w3.org/ns/prov#")

    def add_entity(self, entity_id: str, label: str, attributes: dict[str, Any] = None):
        self.doc.entity(entity_id, {prov.model.PROV_LABEL: label, **(attributes or {})})

    def add_activity(self, activity_id: str, start_time: datetime.datetime = None, end_time: datetime.datetime = None, attributes: dict[str, Any] = None):
        self.doc.activity(activity_id, startTime=start_time, endTime=end_time, other_attributes=attributes)

    def add_agent(self, agent_id: str, label: str = None):
        self.doc.agent(agent_id, {prov.model.PROV_LABEL: label} if label else None)

    def was_generated_by(self, entity_id: str, activity_id: str):
        self.doc.wasGeneratedBy(entity_id, activity_id)

    def used(self, activity_id: str, entity_id: str):
        self.doc.used(activity_id, entity_id)

    def was_attributed_to(self, entity_id: str, agent_id: str):
        self.doc.wasAttributedTo(entity_id, agent_id)

    def export_json(self):
        return self.doc.serialize(format='json')
