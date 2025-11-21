# Regulatory Compliance Agents

Autonomous intelligent agents that continuously monitor laws, policies, and regulations (domestic and EU/cross-border), automatically updating systems and workflows to maintain near-instantaneous compliance.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ComplianceOrchestrator                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────────┐              │
│  │ RegulationFeed   │───▶│ RegulationAnalysis   │              │
│  │ Monitor          │    │ Agent                │              │
│  └──────────────────┘    └──────────┬───────────┘              │
│         │                           │                           │
│         │ RSS/API                   │ AI Analysis               │
│         │ Polling                   ▼                           │
│         │                ┌──────────────────────┐              │
│         │                │ ComplianceImpact     │              │
│         │                │ Assessor             │              │
│         │                └──────────┬───────────┘              │
│         │                           │                           │
│         │                           │ Risk Scoring              │
│         │                           ▼                           │
│         │                ┌──────────────────────┐              │
│         │                │ WorkflowAdaptation   │              │
│         │                │ Agent                │              │
│         │                └──────────────────────┘              │
│         │                           │                           │
│         │                           │ OPA Policies              │
│         │                           │ Workflow Changes          │
│         │                           ▼                           │
│         │                ┌──────────────────────┐              │
│         └───────────────▶│ Systems & Workflows  │              │
│                          └──────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Agents

### RegulationFeedMonitor
Continuously polls regulatory sources for new laws and policies:
- Federal Register (US)
- EUR-Lex (EU)
- SEC EDGAR (US Securities)
- UK Legislation
- NIST Cybersecurity

### RegulationAnalysisAgent
Analyzes and classifies regulations using AI or rule-based fallback:
- Category classification (data privacy, financial, healthcare, etc.)
- Key requirements extraction
- Cross-border implications detection
- Affected industries identification

### ComplianceImpactAssessor
Evaluates how regulations impact existing systems:
- System inventory mapping
- Compliance gap identification
- Risk score calculation (0-100)
- Severity classification

### WorkflowAdaptationAgent
Generates automatic compliance updates:
- OPA policy generation (consent, retention, access, audit)
- Workflow modification proposals
- Notification rule creation
- Auto-approval for low-risk changes

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in development
pnpm dev

# Run tests
pnpm test

# Build
pnpm build

# Start production
pnpm start
```

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `PORT` | Server port | `3400` |
| `DATABASE_URL` | PostgreSQL connection | - |
| `OPENAI_API_KEY` | OpenAI API key for AI analysis | - |
| `AUTO_APPLY_ADAPTATIONS` | Auto-apply low-risk adaptations | `false` |
| `RISK_THRESHOLD` | Risk score threshold for auto-apply | `30` |
| `JURISDICTIONS` | Monitored jurisdictions | `US,EU,UK` |

## API Endpoints

### Health
```
GET /health
```

### Statistics
```
GET /api/stats
```
Returns system statistics including regulations tracked, assessments completed, and adaptations generated.

### Reports
```
GET /api/reports?start=2024-01-01&end=2024-12-31
```
Generate compliance reports for a date range.

### Manual Analysis
```
POST /api/analyze
Content-Type: application/json

{
  "url": "https://eur-lex.europa.eu/regulation/123",
  "jurisdiction": "EU"
}
```

### Pending Adaptations
```
GET /api/adaptations/pending
```

### Approve Adaptation
```
POST /api/adaptations/:id/approve
Content-Type: application/json

{
  "approvedBy": "compliance-officer@company.com"
}
```

### Apply Adaptation
```
POST /api/adaptations/:id/apply
```

## Generated OPA Policies

The agent generates Rego policies for:

- **Consent Management**: Validates consent requirements
- **Data Retention**: Enforces retention periods by data category
- **Access Control**: Role-based and classification-based access
- **Audit Requirements**: Determines when audit logging is required

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm test:watch
```

## Integration

The service integrates with:
- **OPA (Open Policy Agent)**: Policy enforcement
- **PostgreSQL**: Persistence of regulations, assessments, and adaptations
- **Redis/BullMQ**: Async job processing (optional)
- **OpenAI**: AI-powered regulation analysis (optional, falls back to rules)
