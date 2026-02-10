from typing import List, Dict, Any
from graphrag.store.repl_log import ReplLog, ReplEvent

class Reconciler:
    def reconcile(self, log: ReplLog) -> Dict[str, Any]:
        """
        Reconciles the log into a final state deterministically.
        """
        state: Dict[str, Any] = {}
        for event in log.all():
            if isinstance(event.payload, dict):
                state.update(event.payload)
        return state
