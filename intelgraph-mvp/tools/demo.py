import json
import time
from pathlib import Path

import requests

API_URL = "http://localhost:8000"
TENANT = "t1"
CASE = "c1"
MAPPING = {
    "person.name": "person_name",
    "person.email": "person_email",
    "person.phone": "person_phone",
    "org.name": "org_name",
    "event.name": "event_name",
    "event.occurred_at": "event_time",
    "location.name": "location_name",
    "location.lat": "lat",
    "location.lon": "lon",
    "document.title": "doc_title",
    "document.url": "doc_url",
}


def get_token() -> str:
    resp = requests.post(
        f"{API_URL}/auth/token",
        json={"sub": "demo", "roles": ["analyst"], "clearances": ["analyst"], "cases": [CASE]},
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def apply_constraints(token: str) -> None:
    # constraints run during startup but keep an explicit call via neighbors to warm connection
    requests.get(
        f"{API_URL}/health",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": TENANT, "X-Case-ID": CASE},
    )


def ingest_sample(token: str) -> None:
    csv_path = Path(__file__).resolve().parents[0] / "sample_data" / "contacts.csv"
    with open(csv_path, "rb") as handle:
        files = {"file": handle}
        data = {
            "mapping": json.dumps(MAPPING),
            "provenance": json.dumps({"source": "csv", "license": "CC0"}),
            "policy": json.dumps({"sensitivity": "T", "clearance": ["analyst"]}),
        }
        headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": TENANT, "X-Case-ID": CASE}
        resp = requests.post(f"{API_URL}/ingest/csv", files=files, data=data, headers=headers)
        resp.raise_for_status()


def fetch_neighbors(token: str) -> dict:
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": TENANT, "X-Case-ID": CASE}
    search = requests.get(f"{API_URL}/gateway/search", params={"q": "Alice"}, headers=headers)
    search.raise_for_status()
    results = search.json().get("results", [])
    if not results:
        return {}
    target_id = results[0]["id"]
    neighbor = requests.get(
        f"{API_URL}/gateway/neighbors/{target_id}", params={"max_hops": 2}, headers=headers
    )
    neighbor.raise_for_status()
    return neighbor.json()


def main():
    token = get_token()
    apply_constraints(token)
    start = time.perf_counter()
    ingest_sample(token)
    ingest_duration = (time.perf_counter() - start) * 1000
    neighbors = fetch_neighbors(token)
    neighbor_count = len(neighbors.get("nodes", []))
    print(f"Ingest completed in {ingest_duration:.1f}ms; neighbor nodes returned: {neighbor_count}")


if __name__ == "__main__":
    main()
