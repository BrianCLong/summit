from typing import List, Optional, Dict, Any
from .base import ContextProvider, Entity

class MockCRMProvider(ContextProvider):
    def __init__(self):
        self._data = {
            "cust_001": Entity("cust_001", "Customer", {"name": "Acme Corp", "status": "Active"}, []),
            "cust_002": Entity("cust_002", "Customer", {"name": "Globex", "status": "Churned"}, []),
        }

    def get_entity(self, entity_id: str) -> Optional[Entity]:
        return self._data.get(entity_id)

    def search_entities(self, query: str) -> List[Entity]:
        results = []
        for entity in self._data.values():
            if query.lower() in entity.attributes["name"].lower():
                results.append(entity)
        return sorted(results, key=lambda x: x.id)
