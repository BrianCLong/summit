# dlc-client

Python client SDK for interacting with the Data Lease Controller (DLC) service. The client wraps the HTTP API provided by the Rust DLC server and provides convenient helpers for constructing lease specifications, recording access, and closing leases with receipts.

## Quick start

```python
from dlc_client import DlcClient, LeaseSpec, RowScope

spec = LeaseSpec(
    dataset_id="dataset-alpha",
    purposes=["analytics"],
    row_scope=RowScope.explicit(["row-1", "row-2"]),
    expiry="2025-01-01T00:00:00Z",
)

with DlcClient("http://localhost:8080") as client:
    lease = client.create_lease(spec)
    client.record_access(lease["id"], "row-1")
    receipt = client.close_lease(lease["id"])
    print(receipt)
```
