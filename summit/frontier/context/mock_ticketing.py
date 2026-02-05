from typing import List, Optional, Dict, Any
from .base import ContextProvider, Entity

class MockTicketingProvider(ContextProvider):
    def __init__(self):
        self._data = {
            "tkt_100": Entity("tkt_100", "Ticket", {"title": "Login failed", "priority": "High"}, ["cust_001"]),
            "tkt_101": Entity("tkt_101", "Ticket", {"title": "Feature request", "priority": "Low"}, ["cust_002"]),
        }

    def get_entity(self, entity_id: str) -> Optional[Entity]:
        return self._data.get(entity_id)

    def search_entities(self, query: str) -> List[Entity]:
        results = []
        for entity in self._data.values():
            if query.lower() in entity.attributes["title"].lower():
                results.append(entity)
        return sorted(results, key=lambda x: x.id)
