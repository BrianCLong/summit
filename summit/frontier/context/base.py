from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class Entity:
    id: str
    kind: str
    attributes: Dict[str, Any]
    related_ids: List[str]

class ContextProvider(ABC):
    @abstractmethod
    def get_entity(self, entity_id: str) -> Optional[Entity]:
        """Retrieve an entity by ID."""
        pass

    @abstractmethod
    def search_entities(self, query: str) -> List[Entity]:
        """Search for entities matching the query."""
        pass
