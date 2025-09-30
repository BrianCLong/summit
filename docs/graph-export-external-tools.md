# Graph Export Integration Guide

This guide explains how to export IntelGraph subgraphs for use in external network analysis tools such as Gephi and Cytoscape. The export flow is implemented through a GraphQL mutation that prepares the data server-side and a REST download endpoint that streams the generated file.

## Overview

1. Call the `exportInvestigationGraph` mutation with the desired format (`GRAPHML` or `GEXF`) and optional filters.
2. Receive a payload containing metadata about the export and a download URL.
3. Download the file from `/api/graph/exports/:exportId` and load it into your visualization tool of choice.

Supported formats:

- **GraphML (`.graphml`)** – widely supported, preserves attributes as JSON blobs.
- **GEXF (`.gexf`)** – optimized for Gephi, includes edge weights and typed attributes.

## GraphQL Mutation

```graphql
mutation ExportInvestigationGraph($input: ExportArgs!) {
  exportInvestigationGraph(
    investigationId: $input.investigationId
    tenantId: $input.tenantId
    format: $input.format
    filters: $input.filters
  ) {
    exportId
    format
    filename
    contentType
    size
    downloadUrl
    expiresAt
    filtersApplied
  }
}
```

Example variables:

```json
{
  "input": {
    "investigationId": "inv-123",
    "tenantId": "tenant-1",
    "format": "GEXF",
    "filters": {
      "nodeTypes": ["PERSON", "ORG"],
      "relationshipTypes": ["LINKED_TO", "OWNS"],
      "minConfidence": 0.6,
      "maxNodes": 5000,
      "maxEdges": 10000
    }
  }
}
```

The mutation response includes a `downloadUrl` of the form `/api/graph/exports/{exportId}`. The link is valid for one hour (configurable via `GRAPH_EXPORT_TTL_MS`) and streams the file using Node.js back-pressure to support large datasets without exhausting memory.

## Downloading the Export

The download endpoint automatically sets `Content-Type`, `Content-Disposition`, and `Content-Length` headers when available. Use any HTTP client to fetch the URL, for example:

```bash
curl -L -o intelgraph.gexf "https://<host>/api/graph/exports/8c0a0c6d-..."
```

Because the response is streamed, tools like `curl` or `wget` will download the file efficiently even for multi-gigabyte exports.

## Loading into External Tools

### Gephi

1. Launch Gephi and choose **File → Open**.
2. Select the downloaded `.gexf` or `.graphml` file.
3. In the import dialog, accept the detected schema. Edge weights are mapped automatically from the `weight` property.
4. Use the **Data Laboratory** to inspect node/edge attributes stored in the `properties` column (JSON format).

### Cytoscape

1. Open Cytoscape and choose **File → Import → Network from File**.
2. Pick the `.graphml` export for best compatibility.
3. Cytoscape will read node and edge attributes, including `type`, `confidence`, and serialized metadata.
4. Use **Style** filters to highlight nodes by type or confidence score.

## Filtering Tips

- `nodeTypes` and `relationshipTypes` limit the export to specific ontology elements.
- `minConfidence` suppresses low-confidence entities while `minWeight` filters weak relationships.
- `maxNodes` and `maxEdges` cap the export size to keep files manageable for desktop tools.
- Tenancy and investigation scoping are enforced automatically; omitting `tenantId` defaults to the caller’s tenant.

## Operational Considerations

- Exports are written to disk under `GRAPH_EXPORT_DIR` (default: OS temp directory) and cleaned up after expiration or via the `cleanupExpiredExports` utility.
- Every export is associated with the requesting user and logged via the resolver for audit trails.
- When building automation, poll the mutation result and download immediately to avoid hitting the TTL window.

## Troubleshooting

- **404 when downloading** – the export has expired or the ID is invalid; re-run the mutation.
- **Large file imports slowly** – increase layout memory inside Gephi/Cytoscape or refine filters to limit the dataset.
- **Missing attributes** – properties are serialized as JSON strings; ensure your tool or downstream pipeline parses the `properties` field if granular access is required.
