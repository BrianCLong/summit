from typing import Dict, Optional

from .models import MoralProfile


class MoralPriors:
    def __init__(self):
        self._store: dict[str, MoralProfile] = {}

    def get_prior(self, actor_id: str) -> Optional[MoralProfile]:
        return self._store.get(actor_id)

    def set_prior(self, actor_id: str, profile: MoralProfile) -> None:
        self._store[actor_id] = profile
