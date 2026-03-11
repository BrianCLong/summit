# SDK Usage Examples

The Summit platform can be accessed via Python and JavaScript/TypeScript. Below are examples for common operations.

## Python SDK

### Installation

```bash
pip install summit-sdk
```

### Initializing the Client

```python
from summit import SummitClient

client = SummitClient(
    base_url="https://api.summit.io",
    token="YOUR_ACCESS_TOKEN"
)
```

### Executing a GraphRAG Query

```python
query = "Who are the key actors in the recent phishing campaign?"
response = client.graphrag.answer(
    investigation_id="inv-456",
    question=query,
    max_hops=2
)

print(f"Answer: {response.answer}")
print(f"Confidence: {response.confidence}")
for citation in response.citations.entity_ids:
    print(f"Source Entity: {citation}")
```

### Submitting Ingestion Data

```python
from summit.models import IngestEnvelope

envelope = IngestEnvelope(
    tenant_id="tenant-789",
    event_type="ingest.entity.v1",
    source_service="manual-upload",
    entity={"type": "organization", "id": "org-999"},
    data={"name": "Suspicious Corp", "country": "Unknown"}
)

job = client.ingest.submit(envelope)
print(f"Ingest Job ID: {job.id}")
```

---

## JavaScript/TypeScript SDK

### Installation

```bash
npm install @summit/sdk
```

### Initializing the Client

```typescript
import { SummitClient } from "@summit/sdk";

const client = new SummitClient({
  baseUrl: "https://api.summit.io",
  token: "YOUR_ACCESS_TOKEN",
});
```

### Fetching Cases

```typescript
const cases = await client.cases.list();
cases.items.forEach((c) => {
  console.log(`Case: ${c.title} (ID: ${c.id})`);
});
```

### GraphRAG Query (GraphQL)

```typescript
const result = await client.graphql.query({
  query: `
    query GetAnswer($input: GraphRAGQueryInput!) {
      graphRagAnswer(input: $input) {
        answer
        confidence
        why_paths {
          relId
          type
        }
      }
    }
  `,
  variables: {
    input: {
      investigationId: "inv-456",
      question: "What is the connection between Person A and Org B?",
    },
  },
});

console.log(result.data.graphRagAnswer.answer);
```

### Monitoring Ingestion Progress

```typescript
const jobId = "job-123";
const status = await client.ingest.getProgress(jobId);

if (status.state === "completed") {
  console.log("Ingestion finished successfully.");
} else {
  console.log(`Job state: ${status.state} (${status.progress}%)`);
}
```
