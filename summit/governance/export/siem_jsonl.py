import json
from typing import List
from summit.governance.events.schema import AuditEvent

def export_to_jsonl(events: List[AuditEvent], output_path: str):
    """
    Exports events to a JSONL format suitable for SIEM ingestion (e.g., Splunk, ELK).
    """
    with open(output_path, 'w', encoding='utf-8') as f:
        for event in events:
            f.write(event.model_dump_json() + '\n')
