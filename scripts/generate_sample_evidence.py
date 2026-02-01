import sys
import os
import shutil
# Add root to path
sys.path.append(os.getcwd())

from summit.governance.events.schema import AuditEvent
from summit.governance.evidence.generate import EvidenceGenerator

def main():
    events = [
        AuditEvent(trace_id="t1", event_type="test", actor="user"),
        AuditEvent(trace_id="t2", event_type="ToolExecuted", actor="agent", metadata={"tool": "test"})
    ]

    output_dir = "artifacts/evidence/EVID-SAMPLE"
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)

    generator = EvidenceGenerator(output_dir)
    report = generator.generate_report(events)
    metrics = generator.generate_metrics(events)
    stamp = generator.generate_stamp([report, metrics])

    print(f"Generated evidence at {generator.output_dir}")

if __name__ == "__main__":
    main()
