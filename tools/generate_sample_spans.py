from __future__ import annotations

import os
import time
import uuid

from emitters.otel_openlineage_emitter import emit_from_spans


def generate_spans():
    trace_id = str(uuid.uuid4())
    run_id = str(uuid.uuid4())

    spans = [
        {
            "trace_id": trace_id,
            "name": "process_orders",
            "resource": {"service.name": "order_svc"},
            "attributes": {
                "openlineage.run_id": run_id,
                "db.system": "postgres",
                "db.name": "orders",
                "db.statement_hash": "abc123hash"
            }
        },
        {
             "trace_id": trace_id,
             "name": "process_orders_complete",
             "resource": {"service.name": "order_svc"},
             "attributes": {
                 "openlineage.run_id": run_id,
                 "db.system": "postgres",
                 "db.name": "orders",
                 "db.statement_hash": "abc123hash"
             }
        }
    ]
    emit_from_spans(spans)

if __name__ == "__main__":
    generate_spans()
