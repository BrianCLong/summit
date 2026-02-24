from typing import List, Dict, Any
from ..sessions.checkpoints.manager import SessionState

class AgentReplayer:
    def reconstruct_state(self, trace: List[Dict[str, Any]]) -> SessionState:
        session_id = trace[0].get("session_id", "unknown")
        history = []
        metadata = {}
        max_step = 0
        for event in trace:
            et, d = event.get("event_type"), event.get("data", {})
            if et == "session_start": metadata.update(d.get("metadata", {}))
            elif et == "llm_interaction":
                history.append({"role": "assistant", "content": d.get("response")})
                max_step = max(max_step, d.get("step", 0))
            elif et == "tool_execution":
                history.append({"role": "tool", "name": d.get("tool"), "content": d.get("output")})
        return SessionState(session_id=session_id, step=max_step, history=history, metadata=metadata)
