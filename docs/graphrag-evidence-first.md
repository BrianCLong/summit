# Evidence-First GraphRAG Service

> **Purpose**: Answer analyst questions using **only** graph-linked evidence with **mandatory citations** and **explicit gaps/unknowns**.

## Overview

The Evidence-First GraphRAG service provides citation-backed answers from case-specific evidence. It enforces strict requirements:

1. **Evidence-Only Answers**: Responses are generated exclusively from evidence linked to the case graph
2. **Mandatory Citations**: Every factual claim must cite specific evidence IDs
3. **Explicit Unknowns**: The system must declare what it cannot answer
4. **Policy Enforcement**: Evidence is filtered based on user clearances and permissions
5. **Complete Audit Trail**: All queries are logged for compliance

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GraphRAG Service                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    POST /graphrag/answer                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  1. Case Access Check                          │  │
│  │          (User must be member of case)                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 2. Retrieval Pipeline                          │  │
│  │  ┌─────────────────┐    ┌─────────────────────────────────┐   │  │
│  │  │ CaseGraphRepo   │    │ EvidenceRepository              │   │  │
│  │  │ (Neo4j)         │    │ (PostgreSQL full-text search)   │   │  │
│  │  │ - Nodes         │    │ - Evidence snippets             │   │  │
│  │  │ - Edges         │    │ - Relevance scoring             │   │  │
│  │  └─────────────────┘    └─────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  3. Policy Filtering                           │  │
│  │  - Classification level checks                                 │  │
│  │  - Need-to-know tag validation                                 │  │
│  │  - License/usage restrictions                                  │  │
│  │  - Tenant isolation                                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                4. LLM Answer Generation                        │  │
│  │  - Context payload construction                                │  │
│  │  - System prompt enforcing citations                           │  │
│  │  - JSON structured output                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              5. Citation Validation                            │  │
│  │  - Verify all cited IDs exist in context                       │  │
│  │  - Reject answers without valid citations                      │  │
│  │  - Extract unknowns/gaps                                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  6. Audit Logging                              │  │
│  │  - Request metadata                                            │  │
│  │  - Context summary (no PII)                                    │  │
│  │  - Answer summary                                              │  │
│  │  - Policy decisions                                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## API Reference

### POST /graphrag/answer

Get a citation-backed answer to a question about a case.

**Request Body:**
```json
{
  "caseId": "case-123",
  "question": "When did the suspect meet with the witness?"
}
```

**Response:**
```json
{
  "answer": {
    "answerText": "The suspect met with the witness on January 15th at the downtown office [evidence: EV-001].",
    "citations": [
      {
        "evidenceId": "EV-001",
        "claimId": "CLM-001"
      }
    ],
    "unknowns": [
      "The specific time of the meeting is not recorded in the evidence."
    ],
    "usedContextSummary": {
      "numNodes": 12,
      "numEdges": 18,
      "numEvidenceSnippets": 5
    }
  },
  "rawContext": {
    "nodes": [...],
    "edges": [...],
    "evidenceSnippets": [...]
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### GET /graphrag/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "graphrag",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

## Citation Format

Citations in the answer text follow the format:
- `[evidence: EV-ID]` - Citation to a specific evidence item
- `[evidence: EV-ID, claim: CLM-ID]` - Citation including the associated claim

The `citations` array in the response contains structured references that can be used to:
- Link to the original evidence in the UI
- Display source information on hover
- Navigate to the full evidence document

## Unknowns & Gaps

The service explicitly tracks what it **cannot** answer:

1. **No evidence available**: The query found no matching evidence
2. **Evidence filtered by policy**: User lacks clearance for available evidence
3. **LLM-identified gaps**: The LLM reports missing information in its response

Example unknowns:
```json
{
  "unknowns": [
    "The motive for the meeting is not documented in available evidence.",
    "2 evidence items were filtered due to policy restrictions."
  ]
}
```

## Policy & Access Control

Evidence is filtered based on:

| Check | Description |
|-------|-------------|
| **Classification** | User's clearance level vs evidence classification (PUBLIC → TS-SCI) |
| **Need-to-Know** | User must have at least one matching tag |
| **License** | Evidence license must allow ANALYZE/INTERNAL_USE |
| **Tenant** | Evidence must belong to user's tenant |
| **Case Membership** | User must be a member of the case |

If all evidence is filtered, the response will be:
```json
{
  "answerText": "No evidence is available for you to view in this case based on your current permissions.",
  "citations": [],
  "unknowns": ["5 evidence item(s) were not visible due to policy restrictions."]
}
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_API_URL` | LLM API endpoint | `https://api.openai.com/v1/chat/completions` |
| `LLM_API_KEY` | API key for LLM | (required) |
| `LLM_MODEL` | Model to use | `gpt-4o-mini` |
| `GRAPHRAG_REDIS_URL` | Redis for caching (optional) | - |
| `NEO4J_URI` | Neo4j connection URI | (required) |
| `NEO4J_USER` | Neo4j username | (required) |
| `NEO4J_PASSWORD` | Neo4j password | (required) |

## Database Schema

### case_evidence Table
```sql
CREATE TABLE case_evidence (
  id UUID PRIMARY KEY,
  case_id TEXT NOT NULL,
  content TEXT NOT NULL,
  source_system TEXT,
  classification TEXT,
  license_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX case_evidence_case_idx ON case_evidence (case_id);
CREATE INDEX case_evidence_content_idx ON case_evidence USING gin(to_tsvector('english', content));
```

### graphrag_audit_log Table
```sql
CREATE TABLE graphrag_audit_log (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  question TEXT NOT NULL,
  context_num_nodes INT NOT NULL DEFAULT 0,
  context_num_edges INT NOT NULL DEFAULT 0,
  context_num_evidence INT NOT NULL DEFAULT 0,
  answer_has_answer BOOLEAN NOT NULL DEFAULT false,
  answer_num_citations INT NOT NULL DEFAULT 0,
  answer_num_unknowns INT NOT NULL DEFAULT 0,
  policy_filtered_count INT NOT NULL DEFAULT 0,
  policy_allowed_count INT NOT NULL DEFAULT 0
);
```

## Usage Examples

### Basic Usage (TypeScript)

```typescript
import { getGraphRagService } from './services/graphrag';

const service = getGraphRagService();

const response = await service.answer(
  {
    caseId: 'case-123',
    question: 'Who are the key suspects?',
    userId: 'analyst-001',
  },
  {
    userId: 'analyst-001',
    roles: ['analyst'],
    clearances: ['SECRET'],
    cases: ['case-123'],
  }
);

console.log(response.answer.answerText);
console.log(`Citations: ${response.answer.citations.length}`);
console.log(`Gaps: ${response.answer.unknowns.join(', ')}`);
```

### Frontend Integration

```typescript
// React hook example
const useGraphRagAnswer = (caseId: string) => {
  const [answer, setAnswer] = useState<GraphRagResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const askQuestion = async (question: string) => {
    setLoading(true);
    try {
      const response = await fetch('/graphrag/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, question }),
      });
      const data = await response.json();
      setAnswer(data);
    } finally {
      setLoading(false);
    }
  };

  return { answer, loading, askQuestion };
};
```

### Displaying Citations in UI

```tsx
// Parse and render inline citations
function renderWithCitations(text: string, citations: Citation[]) {
  const parts = text.split(/(\[evidence: [^\]]+\])/g);

  return parts.map((part, i) => {
    const match = part.match(/\[evidence: ([^\],]+)(?:, claim: ([^\]]+))?\]/);
    if (match) {
      const citation = citations.find(c => c.evidenceId === match[1]);
      return (
        <CitationLink key={i} citation={citation}>
          {part}
        </CitationLink>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
```

## Testing

Run the test suite:

```bash
# All GraphRAG tests
pnpm test -- src/tests/graphrag/

# Individual test files
pnpm test -- src/tests/graphrag/retrieval.test.ts
pnpm test -- src/tests/graphrag/policy-guard.test.ts
pnpm test -- src/tests/graphrag/service.test.ts
```

## Performance & Limits

| Parameter | Default | Max |
|-----------|---------|-----|
| Max nodes in context | 50 | 100 |
| Max edges in context | - | 200 |
| Max evidence snippets | 20 | 50 |
| Max answer length | - | 10,000 chars |
| Question max length | - | 2,000 chars |

## Troubleshooting

### "No evidence is available"
- Check user's case membership
- Verify evidence exists for the case in `case_evidence` table
- Check user's clearance level matches evidence classification

### "Unable to generate citation-backed answer"
- LLM could not cite evidence for its claims
- Evidence may not be relevant to the question
- Try rephrasing the question

### Empty citations array
- LLM response did not include valid evidence IDs
- All cited IDs were invalid and filtered out
- Check LLM API connection and response format

## Future Enhancements

- [ ] Streaming responses for long answers
- [ ] Multi-turn conversation support
- [ ] Evidence relevance feedback loop
- [ ] Citation confidence scoring
- [ ] Cross-case evidence linking (with policy controls)
- [ ] Answer caching for repeated questions
