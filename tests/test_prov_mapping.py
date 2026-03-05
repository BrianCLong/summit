from __future__ import annotations

import json

from emitters.otel_prov_mapper import to_prov


def test_namespace_name_canonical():
    ev = [{
        "eventType": "START",
        "run": {"runId": "abc"},
        "job": {"namespace": "summit://local", "name": "svc.op"},
        "inputs": [{"namespace": "ns://db/postgres", "name": "orders", "datasetType": "DB_TABLE", "facets": {"schema": {}}}],
        "producer": "producer://test"
    }]
    prov = to_prov(ev)
    key = "ns://db/postgres:orders"
    assert key in prov["entity"]

def test_run_id_propagation():
    ev = [
      {"eventType":"START","run":{"runId":"rid-1"},"job":{"namespace":"x","name":"y"},"producer":"p"},
      {"eventType":"COMPLETE","run":{"runId":"rid-1"},"job":{"namespace":"x","name":"y"},"producer":"p"},
    ]
    prov = to_prov(ev)
    assert "run:rid-1" in prov["activity"]
