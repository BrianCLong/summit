from typing import Any, Dict, List

from graphrag.store.repl_log import ReplEvent, ReplLog


class Reconciler:
    def reconcile(self, log: ReplLog) -> dict[str, Any]:
        """
        Reconciles the log into a final state deterministically.
        """
        state: dict[str, Any] = {}
        for event in log.all():
            if isinstance(event.payload, dict):
                state.update(event.payload)
        return state
