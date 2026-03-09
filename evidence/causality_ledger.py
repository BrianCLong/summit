import datetime
import json
import logging
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

@dataclass
class OutsourcingEvent:
    event_id: str
    timestamp: str
    ai_instruction: str
    human_role: str
    action_verb: str
    domain: str
    evidence_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class CausalityLedger:
    """
    Logs AI attempts to outsource tasks to humans.
    Provides a persistent record for audit and governance.
    """

    def __init__(self, log_dir: str = "evidence/logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.ledger_file = self.log_dir / "causality_ledger.jsonl"

    def log_attempt(self,
                   ai_instruction: str,
                   human_role: str = "unknown",
                   action_verb: str = "unknown",
                   domain: str = "general",
                   evidence_id: Optional[str] = None,
                   metadata: Optional[Dict[str, Any]] = None) -> str:

        event_id = str(uuid.uuid4())
        event = OutsourcingEvent(
            event_id=event_id,
            timestamp=datetime.datetime.utcnow().isoformat(),
            ai_instruction=ai_instruction,
            human_role=human_role,
            action_verb=action_verb,
            domain=domain,
            evidence_id=evidence_id,
            metadata=metadata or {}
        )

        entry = asdict(event)

        try:
            with open(self.ledger_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
            logger.info(f"Logged outsourcing attempt {event_id} to {self.ledger_file}")
            return event_id
        except Exception as e:
            logger.error(f"Failed to log outsourcing attempt: {e}")
            raise e

    def read_ledger(self) -> list[Dict[str, Any]]:
        if not self.ledger_file.exists():
            return []

        entries = []
        with open(self.ledger_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        entries.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        return entries
