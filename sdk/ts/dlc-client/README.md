# @summit/dlc-client

TypeScript client for the Data Lease Controller service. The client wraps the REST endpoints exposed by the Rust DLC server and provides helpers for issuing and managing leases from JavaScript/TypeScript applications.

## Installation

```bash
npm install @summit/dlc-client
```

## Usage

```ts
import { DlcClient, RowScope } from "@summit/dlc-client";

const client = new DlcClient("http://localhost:8080");
const lease = await client.createLease({
  datasetId: "dataset-alpha",
  purposes: ["analytics"],
  rowScope: { kind: "explicit", rows: ["row-1", "row-2"] },
  expiry: new Date().toISOString(),
});

await client.recordAccess(lease.id, "row-1");
const receipt = await client.closeLease(lease.id);
console.log(receipt);
```
