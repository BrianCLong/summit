# AI Copilot for IntelGraph - Implementation Guide

> **Version**: 1.0
> **Last Updated**: 2025-11-24
> **Status**: Production Ready

## Overview

The AI Copilot for IntelGraph provides intelligent, natural-language-powered analysis capabilities for intelligence analysts. It combines:

1. **Natural Language → Graph Query (NL2Cypher)**: Converts analyst questions into safe, executable Cypher queries
2. **GraphRAG (Retrieval Augmented Generation)**: Contextual Q&A over knowledge graphs with citations
3. **Query Preview & Sandbox**: Safe query exploration with cost estimation
4. **Citation & Provenance**: Full audit trail linking answers to evidence
5. **Redaction & Policy**: Privacy-preserving answers respecting classification levels
6. **Guardrails & Safety**: Protection against prompt injection and adversarial inputs

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Copilot Orchestrator                     │
│                 (Intelligent Mode Selection)                    │
└────────────────┬────────────────────────────────────┬───────────┘
                 │                                    │
      ┌──────────▼──────────┐              ┌─────────▼──────────┐
      │  NL2Cypher Service  │              │   GraphRAG Service │
      │  (Structured Data)  │              │  (Contextual Q&A)  │
      └──────────┬──────────┘              └─────────┬──────────┘
                 │                                    │
      ┌──────────▼────────────────────────────────────▼──────────┐
      │              Shared Infrastructure                       │
      │  - Query Preview Service                                 │
      │  - Glass-Box Run Service (Observability)                 │
      │  - Redaction Service                                     │
      │  - Prov-Ledger Client (Provenance)                       │
      │  - Guardrails Service                                    │
      └──────────────────────────────────────────────────────────┘
                            │
      ┌─────────────────────▼──────────────────────┐
      │         Data Layer                         │
      │  - Neo4j (Graph Data)                      │
      │  - PostgreSQL (Metadata, Audit)            │
      │  - Redis (Caching)                         │
      │  - Prov-Ledger (Evidence & Claims)         │
      └────────────────────────────────────────────┘
```

## Key Components

### 1. AI Copilot Orchestrator

**Location**: `server/src/services/AICopilotOrchestrator.ts`

**Purpose**: Unified entry point for all AI-powered queries. Intelligently routes requests to the appropriate service.

**Mode Selection**:
- **Auto Mode**: Analyzes query characteristics to select best mode
  - Structured queries (e.g., "show all entities") → NL2Cypher
  - Contextual questions (e.g., "why is X connected to Y?") → GraphRAG
- **Manual Mode**: User explicitly chooses `nl2cypher` or `graphrag`

### 2. GraphRAG Query Service (Enhanced)

**Location**: `server/src/services/GraphRAGQueryServiceEnhanced.ts`

**Capabilities**:
- Natural language understanding with context
- Graph traversal and relationship reasoning
- Answer generation with inline citations
- Redaction of sensitive fields
- Provenance tracking for citations
- Registration of answers as verifiable claims

**Workflow**:
```
Question
  ↓
Guardrails Check
  ↓
Query Preview Generation (optional)
  ↓
GraphRAG Retrieval & Generation
  ↓
Redaction Filter
  ↓
Citation Enrichment (with provenance)
  ↓
Answer Registration as Claim (optional)
  ↓
Response with Citations
```

### 3. NL2Cypher Service

**Location**: `server/src/services/NLToCypherService.ts`

**Capabilities**:
- LLM-powered translation of NL → Cypher
- Schema-aware query generation
- Cost estimation and complexity analysis
- Safety validation (no mutations, injections)
- Sandbox execution support

### 4. Supporting Services

#### Query Preview Service
**Purpose**: Generate query previews with cost estimates and risk assessment before execution.

#### Glass-Box Run Service
**Purpose**: Capture complete execution traces for observability and replay.

#### Redaction Service
**Purpose**: Apply policy-driven redaction to protect PII, financial data, and sensitive information.

#### Prov-Ledger Client
**Purpose**: Track provenance of all evidence and claims, enabling verification and audit.

#### Guardrails Service
**Purpose**: Detect and block prompt injection, jailbreak attempts, and other adversarial inputs.

## API Reference

### Base URL

```
POST /api/ai-copilot/query
```

### Request Schema

```typescript
{
  investigationId: string;
  question: string;
  mode?: 'nl2cypher' | 'graphrag' | 'auto';
  focusEntityIds?: string[];
  maxHops?: number;

  // Redaction & Security
  redactionPolicy?: {
    enabled: boolean;
    rules: ('pii' | 'financial' | 'sensitive' | 'k_anon')[];
    allowedFields?: string[];
    classificationLevel?: 'public' | 'internal' | 'confidential' | 'secret';
  };

  // Provenance
  provenanceContext?: {
    authorityId: string;
    reasonForAccess: string;
    claimId?: string;
    evidenceIds?: string[];
  };
  registerClaim?: boolean;

  // Preview & Execution
  generateQueryPreview?: boolean;
  autoExecute?: boolean;
  dryRun?: boolean;

  // Limits
  maxRows?: number;
  timeout?: number;

  // Guardrails
  enableGuardrails?: boolean;
  riskTolerance?: 'low' | 'medium' | 'high';
}
```

### Response Schema

```typescript
{
  success: boolean;
  data: {
    mode: 'nl2cypher' | 'graphrag';
    result: {
      // For GraphRAG
      answer: string;
      confidence: number;
      citations: Array<{
        entityId: string;
        entityName: string;
        snippetText?: string;
        confidence?: number;
        sourceUrl?: string;
        evidenceId?: string;
        provenanceChain?: {
          chainId: string;
          rootHash: string;
          verifiable: boolean;
        };
        wasRedacted?: boolean;
        redactedFields?: string[];
      }>;
      why_paths?: Array<{...}>;
      redactionApplied?: boolean;
      uncertaintyDueToRedaction?: string;
      answerClaimId?: string;
      provenanceVerified?: boolean;

      // For NL2Cypher
      cypher?: string;
      explanation?: string;
      estimatedCost?: number;
      complexity?: 'low' | 'medium' | 'high';

      // Common
      preview?: {
        id: string;
        generatedQuery: string;
        queryExplanation: string;
        costLevel: string;
        riskLevel: string;
      };
      runId: string;
      executionTimeMs: number;
      guardrailsPassed?: boolean;
      guardrailWarnings?: string[];
    };
    executionTimeMs: number;
    runId: string;
    modeSelectionReasoning?: string;
  };
}
```

### Additional Endpoints

```
GET  /api/ai-copilot/history/:investigationId
GET  /api/ai-copilot/run/:runId
POST /api/ai-copilot/replay/:runId
GET  /api/ai-copilot/health
GET  /api/ai-copilot/capabilities
```

## Usage Examples

### Example 1: Contextual Question with Citations

```bash
curl -X POST http://localhost:4000/api/ai-copilot/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "investigationId": "inv-123",
    "question": "What is the significance of the connection between John Doe and ACME Corp?",
    "mode": "graphrag",
    "autoExecute": true,
    "provenanceContext": {
      "authorityId": "analyst-456",
      "reasonForAccess": "active investigation"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "mode": "graphrag",
    "result": {
      "answer": "John Doe is the CEO of ACME Corp, which is under investigation for financial irregularities...",
      "confidence": 0.87,
      "citations": [
        {
          "entityId": "person-1",
          "entityName": "John Doe",
          "snippetText": "CEO of ACME Corp since 2020",
          "confidence": 0.9,
          "evidenceId": "evidence-001",
          "provenanceChain": {
            "chainId": "chain-001",
            "rootHash": "abc123...",
            "verifiable": true
          }
        }
      ],
      "provenanceVerified": true,
      "runId": "run-789",
      "executionTimeMs": 1250
    }
  }
}
```

### Example 2: Structured Query with Preview

```bash
curl -X POST http://localhost:4000/api/ai-copilot/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "investigationId": "inv-123",
    "question": "Show all Person entities connected to organizations in the technology sector",
    "mode": "nl2cypher",
    "generateQueryPreview": true,
    "autoExecute": false
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "mode": "nl2cypher",
    "result": {
      "cypher": "MATCH (p:Person)-[:WORKS_FOR]->(o:Organization {sector: 'technology'}) WHERE p.investigationId = $investigationId RETURN p, o LIMIT 100",
      "explanation": "Finds all Person entities with WORKS_FOR relationships to Organizations in the technology sector",
      "estimatedCost": 0.15,
      "estimatedRows": 50,
      "complexity": "low",
      "allowed": true,
      "preview": {
        "id": "preview-123",
        "costLevel": "low",
        "riskLevel": "low",
        "canExecute": true
      }
    }
  }
}
```

### Example 3: Query with Redaction

```bash
curl -X POST http://localhost:4000/api/ai-copilot/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "investigationId": "inv-123",
    "question": "What is the contact information for John Doe?",
    "mode": "graphrag",
    "redactionPolicy": {
      "enabled": true,
      "rules": ["pii"],
      "classificationLevel": "confidential"
    },
    "autoExecute": true
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "mode": "graphrag",
    "result": {
      "answer": "John Doe can be reached at [EMAIL REDACTED] or [PHONE REDACTED].",
      "confidence": 0.85,
      "redactionApplied": true,
      "uncertaintyDueToRedaction": "Some information has been redacted due to policy constraints (pii). The answer reflects only visible data.",
      "citations": [...]
    }
  }
}
```

## Configuration

### Environment Variables

```bash
# LLM Configuration
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
LLM_API_KEY=sk-...
LLM_TEMPERATURE=0.1

# Guardrails
GUARDRAILS_ENABLED=true
PROMPT_INJECTION_DETECTION=true
RISK_TOLERANCE_DEFAULT=medium

# Redaction
REDACTION_ENABLED=true
PII_REDACTION_RULES=pii,financial,sensitive
CLASSIFICATION_LEVEL=confidential

# Provenance
PROV_LEDGER_URL=http://prov-ledger:8000
PROV_LEDGER_ENABLED=true
AUTO_REGISTER_CLAIMS=false

# Performance
QUERY_PREVIEW_ENABLED=true
SANDBOX_EXECUTION_TIMEOUT=30000
MAX_QUERY_COST=1000
CACHE_TTL=300

# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=...

# PostgreSQL
POSTGRES_URI=postgresql://user:pass@postgres:5432/intelgraph

# Redis
REDIS_URI=redis://redis:6379
```

### Model Configuration

Models are configurable per use case in `server/src/config/graphrag.ts`:

```typescript
export default {
  useCases: {
    default: {
      llmModel: 'gpt-4',
      tokenBudget: 1000,
      latencyBudgetMs: 5000,
      promptSchema: z.object({ question: z.string() }),
      outputSchema: GraphRAGResponseSchema,
    },
    'quick-summary': {
      llmModel: 'gpt-3.5-turbo',
      tokenBudget: 500,
      latencyBudgetMs: 2000,
      // ...
    },
  },
};
```

## Security & Compliance

### Guardrails

The system defends against:
- **Prompt Injection**: Detection of "ignore previous instructions" and variants
- **Jailbreak Attempts**: Blocking of DAN mode, developer mode, etc.
- **Data Exfiltration**: Prevention of attempts to extract secrets or credentials
- **Role Manipulation**: Blocking of "act as..." and "you are now..." patterns

### Redaction

Automatic redaction of:
- **PII**: Email, phone, SSN, passport numbers
- **Financial**: Credit cards, bank accounts
- **Sensitive**: IP addresses, user IDs, session tokens

### Provenance

Every answer can be traced to:
- **Source Entities**: Which graph entities contributed
- **Evidence Records**: Original data sources
- **Transform Chains**: How data was processed
- **Claims**: Verifiable assertions with confidence scores

### Audit Trail

All operations logged via Glass-Box Runs:
- User, tenant, investigation context
- Full prompt and parameters
- Execution steps and timing
- Results and confidence scores
- Redaction and provenance metadata

## Testing

### Unit Tests

```bash
# Run all AI Copilot tests
pnpm test src/__tests__/GraphRAGQueryServiceEnhanced.test.ts
pnpm test src/__tests__/AICopilotOrchestrator.test.ts
```

### E2E Tests

```bash
# Run end-to-end tests
pnpm test:e2e src/__tests__/ai-copilot.e2e.test.ts
```

### Manual Testing

```bash
# Health check
curl http://localhost:4000/api/ai-copilot/health

# Capabilities
curl http://localhost:4000/api/ai-copilot/capabilities

# Test query
curl -X POST http://localhost:4000/api/ai-copilot/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @test-query.json
```

## Monitoring & Observability

### Metrics

The following Prometheus metrics are exposed:

- `copilot_query_total{mode, status}`: Total queries by mode and status
- `copilot_query_duration_ms{mode}`: Query execution time
- `copilot_api_request_total{endpoint, status}`: API request counts
- `copilot_api_request_duration_ms{endpoint}`: API request latency
- `graphrag_cache_hit_ratio`: Cache hit rate
- `guardrails_blocked_total{reason}`: Blocked queries by reason

### Logging

Structured JSON logs include:
- Investigation, tenant, user IDs
- Query text (if not sensitive)
- Mode selection reasoning
- Execution time and status
- Citation and provenance metadata

### Tracing

OpenTelemetry spans capture:
- Query orchestration flow
- LLM API calls
- Database queries
- Redaction operations
- Provenance lookups

## Troubleshooting

### Common Issues

#### Issue: Queries blocked by guardrails

**Symptom**: Queries fail with "blocked by guardrails" error

**Solution**:
- Review query for prompt injection patterns
- Adjust `riskTolerance` if appropriate
- Check guardrail logs for specific trigger

#### Issue: Slow query performance

**Symptom**: Queries take >5 seconds

**Solution**:
- Enable query preview to see cost estimates
- Narrow focus with `focusEntityIds`
- Reduce `maxHops` parameter
- Check Redis cache hit rate

#### Issue: Citations missing provenance

**Symptom**: `provenanceVerified: false` in responses

**Solution**:
- Ensure entities have `evidenceId` property
- Verify prov-ledger service is running
- Check `provenanceContext` is provided in request

#### Issue: Redaction not working

**Symptom**: PII visible in responses despite redaction policy

**Solution**:
- Verify `redactionPolicy.enabled: true`
- Check field patterns match redaction rules
- Ensure classification level is appropriate

## Future Enhancements

- [ ] Multi-turn conversations with context
- [ ] Visual query builder integration
- [ ] Hypothesis generation and validation
- [ ] Automated report generation
- [ ] Multi-language support
- [ ] Voice interface integration
- [ ] Real-time collaborative querying

## References

- [GraphRAG Paper](https://arxiv.org/abs/2404.16130)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [Neo4j Cypher Manual](https://neo4j.com/docs/cypher-manual/)

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/BrianCLong/summit/issues
- **Documentation**: https://intelgraph.io/docs/ai-copilot
- **Team**: ai-copilot-team@intelgraph.io
