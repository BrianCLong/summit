import json
from typing import List

import httpx

from maestro_sdk.mul_ledger import ModelUsageEvent, MulLedgerClient


def build_transport(log: List[dict]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/events":
            body = json.loads(request.content.decode("utf-8"))
            record = {
                **body,
                "eventId": body.get("event_id", "evt-" + str(len(log) + 1)),
                "hash": "hash-value",
                "previousHash": log[-1]["hash"] if log else None,
                "sequence": len(log) + 1,
            }
            log.append(record)
            return httpx.Response(201, json=record)
        if request.method == "GET" and request.url.path == "/events":
            return httpx.Response(200, json={"events": list(log)})
        if request.method == "GET" and request.url.path == "/integrity":
            return httpx.Response(200, json={"ok": True})
        if request.method == "GET" and request.url.path == "/compliance-pack":
            return httpx.Response(
                200,
                json={
                    "pack": {
                        "totals": {
                            "events": len(log),
                            "dpBudgetSpend": sum(item["dp_budget_spend"] for item in log),
                        }
                    },
                    "signature": {"value": "sig"},
                    "payload": "{}",
                },
            )
        return httpx.Response(404, json={"error": "not found"})

    return httpx.MockTransport(handler)


def test_python_sdk_logs_and_queries_quickly() -> None:
    log: List[dict] = []
    transport = build_transport(log)
    http_client = httpx.Client(transport=transport, base_url="http://ledger.local")
    client = MulLedgerClient("http://ledger.local", client=http_client)

    event = ModelUsageEvent(
        model="gaia",
        version="1.0.0",
        dataset_lineage_id="dl-001",
        consent_scope="research",
        dp_budget_spend=0.5,
        policy_hash="policy",
        output_artifact_ids=[],
    )

    record = client.log_event(event)
    assert record["model"] == event.model
    events = client.query_events()
    assert len(events) == 1

    integrity = client.integrity_status()
    assert integrity["ok"] is True

    pack = client.export_monthly_compliance_pack("2024-05")
    assert pack["signature"]["value"] == "sig"

    average = client.benchmark_log_event(event, iterations=10)
    assert average < 0.005

    http_client.close()

