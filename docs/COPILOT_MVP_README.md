# AI Copilot MVP - Quick Start

**Auditable by Design Natural Language Graph Querying for Intelligence Analysts**

---

## 🚀 Quick Start (5 Minutes)

### 1. Configure Environment

```bash
# Copy environment template
cp server/.env.example server/.env

# Edit and add your API keys
nano server/.env
```

**Required:**
- `OPENAI_API_KEY` - OpenAI API key for LLM queries
- `NEO4J_PASSWORD` - Neo4j database password

### 2. Install and Setup

```bash
# Run automated setup
./scripts/setup-copilot.sh
```

### 3. Start Services

```bash
# Terminal 1: Start server
cd server && npm run dev

# Terminal 2: Start client
cd client && npm run dev
```

### 4. Use the Copilot

1. Navigate to any investigation
2. Click the **AI Copilot (🤖)** button
3. Ask: "Show me all persons connected to financial entities"
4. Click **Preview Query** → **Execute Query**
5. Explore results with entity citations!

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[Implementation Guide](./COPILOT_MVP_IMPLEMENTATION.md)** | Complete technical architecture and API reference |
| **[User Guide](./USER_GUIDE_AI_COPILOT.md)** | How to use the copilot (for analysts) |
| **[API Schema](../server/src/graphql/schema/copilot-mvp.graphql)** | GraphQL API definitions |

---

## ✨ Features

### Natural Language Queries
Ask questions in plain English:
- "Show me all persons connected to financial entities"
- "Find entities with more than 10 connections"
- "What are suspicious transactions over $50,000?"

### Query Preview & Safety
- See generated Cypher before execution
- Cost and complexity estimates
- Automatic safety checks
- Policy explanations when blocked

### Results with Citations
- Entity citations link results to source data
- Full audit trail with unique IDs
- Clickable navigation to entities

### AI-Powered Insights
- **Hypothesis Generator** - AI suggests investigation theories
- **Narrative Builder** - Automated analytical reports
- **Query Templates** - Pre-built queries for common patterns

---

## 🎯 Example Queries

```
# Entity Discovery
Show me all persons in this investigation
Find entities with confidence greater than 0.8
Show me entities added in the last 7 days

# Relationships
Show me all persons connected to organizations
Find entities with more than 5 connections
What are the most central entities?

# Financial Analysis
Show me all persons who transferred money to offshore accounts
Find transactions greater than 50000 dollars
Show me financial entities flagged as suspicious

# Temporal
Show me all entities active in the last 30 days
Find entities added between January and March 2024

# Network Analysis
What is the shortest path between John Doe and Jane Smith
Find entities that share connections with John Doe
```

---

## 🏗️ Architecture

```
┌─────────────────────┐
│   CopilotSidebar    │  React UI Component
│   (TypeScript)      │
└──────────┬──────────┘
           │ GraphQL
┌──────────▼──────────┐
│   GraphQL API       │  previewNLQuery
│   (copilot-mvp)     │  executeNLQuery
│                     │  generateHypotheses
│                     │  generateNarrative
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ NLToCypherService   │  LLM-powered translation
│                     │  Safety validation
│                     │  Cost estimation
└─────┬───────────┬───┘
      │           │
┌─────▼─────┐ ┌──▼────────┐
│    LLM    │ │  Neo4j    │
│  Service  │ │  Graph    │
└───────────┘ └───────────┘
```

---

## 🔒 Security Features

✅ **Prompt Injection Detection** - Blocks manipulation attempts
✅ **Dangerous Operation Blocking** - No DELETE/DROP/CREATE
✅ **Complexity Thresholds** - Prevents resource exhaustion
✅ **Audit Logging** - Every query tracked with unique ID
✅ **PII Detection** - Automatically flags sensitive data
✅ **GDPR Compliance** - Right to erasure support

---

## 📊 Monitoring

### Prometheus Metrics

```bash
# View all copilot metrics
curl http://localhost:9090/metrics | grep copilot_

# Key metrics:
- copilot_nl_queries_total           # Total queries
- copilot_queries_blocked_total      # Blocked queries
- copilot_query_success_rate         # Success rate
- copilot_llm_api_cost_usd          # LLM costs
- copilot_cypher_execution_duration_seconds  # Performance
```

### Grafana Dashboard

```bash
# Import dashboard
cat monitoring/grafana-copilot-dashboard.json
```

Monitors:
- Query rate and success rate
- Execution time percentiles
- Cost tracking
- Block reasons
- Security events

---

## 🧪 Testing

### Unit Tests

```bash
cd server
npm test -- NLToCypherService.test.ts
```

**Coverage:**
- NL-to-Cypher translation
- Safety blocking
- Cost estimation
- Preview/execute flow

### E2E Tests

```bash
npm run test:e2e -- copilot-mvp.spec.ts
```

**Scenarios:**
- Complete golden path
- Policy blocking
- Citation navigation
- Hypothesis/narrative generation

---

## 💰 Cost Optimization

### Estimated Costs

| Operation | Cost per Request |
|-----------|-----------------|
| NL → Cypher generation | $0.002 - $0.01 |
| Hypothesis generation | $0.01 - $0.05 |
| Narrative generation | $0.02 - $0.10 |

**Monthly estimate (1000 queries/analyst, 10 analysts):**
- $20 - $160/month in LLM API fees

### Optimization Strategies

✅ Query result caching (Redis)
✅ Prompt caching for schema context
✅ Use smaller LLM for simple queries
✅ Batch hypothesis generation

---

## 🐛 Troubleshooting

### "Query generation taking too long"

**Causes:** LLM API latency, complex parsing

**Solutions:**
- Simplify question
- Check API key and rate limits
- Verify network connection

### "Many queries blocked"

**Causes:** False positives or actual policy violations

**Solutions:**
- Review block reasons
- Use simpler language
- Avoid trigger words (delete, remove, destroy)

### "Citations not showing"

**Causes:** Query didn't return entity objects

**Solutions:**
- Ensure query returns entities (not aggregates)
- Verify entities have valid IDs

---

## 📦 What's Included

### Backend Files

```
server/src/
├── services/
│   ├── NLToCypherService.ts          # Core translation service
│   └── __tests__/
│       └── NLToCypherService.test.ts # Unit tests
├── graphql/
│   ├── schema/copilot-mvp.graphql    # API schema
│   └── resolvers.copilot-mvp.ts      # API resolvers
└── monitoring/
    └── copilotMetrics.ts             # Prometheus metrics
```

### Frontend Files

```
client/src/
├── components/copilot/
│   └── CopilotSidebar.tsx            # Main UI component
├── pages/
│   └── InvestigationDetail.tsx       # Integration example
├── hooks/
│   └── useCopilot.ts                 # React hook
├── types/
│   └── copilot.ts                    # TypeScript types
├── graphql/
│   └── copilot.operations.ts         # GraphQL operations
└── data/
    └── copilotTemplates.ts           # Query templates
```

### Documentation

```
docs/
├── COPILOT_MVP_IMPLEMENTATION.md     # Full technical guide
├── USER_GUIDE_AI_COPILOT.md          # User manual
└── COPILOT_MVP_README.md             # This file
```

### Infrastructure

```
scripts/
└── setup-copilot.sh                  # Automated setup

monitoring/
└── grafana-copilot-dashboard.json    # Grafana dashboard

tests/e2e/
└── copilot-mvp.spec.ts               # E2E tests
```

---

## 🔄 Deployment

### Development

```bash
# Start all services
docker-compose up -d

# Run setup
./scripts/setup-copilot.sh

# Start dev servers
npm run dev
```

### Production

```bash
# Build
npm run build

# Run migrations
npm run migrate:up

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

---

## 🛣️ Roadmap

### v1.0 (MVP) ✅
- Natural language queries
- Query preview with cost estimation
- Hypothesis generation
- Narrative building
- Query templates

### v1.1 (Planned)
- Query history with save/reuse
- Voice input support
- Real-time query streaming
- Multi-investigation queries
- Enhanced visualization suggestions

### v2.0 (Future)
- Conversational query refinement
- Automated investigation workflows
- Team collaboration features
- Advanced analytics and reporting
- Integration with external threat intel

---

## 🤝 Contributing

### Reporting Issues

1. Note the **Audit ID** from error message
2. Include query you entered
3. Describe expected vs actual behavior
4. Attach screenshot if applicable

### Adding Query Templates

Edit `client/src/data/copilotTemplates.ts`:

```typescript
{
  id: 'my-template',
  name: 'My Custom Query',
  description: 'What this template does',
  category: 'Custom',
  template: 'Show me all {{entityType}} entities',
  variables: [
    {
      name: 'entityType',
      type: 'entityType',
      description: 'Type of entity',
      required: true,
    }
  ],
  examples: ['Show me all Person entities']
}
```

---

## 📞 Support

- **Documentation:** docs/USER_GUIDE_AI_COPILOT.md
- **API Reference:** server/src/graphql/schema/copilot-mvp.graphql
- **Issues:** File a support ticket with Audit ID
- **Training:** Contact your team lead

---

## ⚖️ License

© 2025 Summit Intelligence Platform. All rights reserved.

This AI Copilot MVP is proprietary software for authorized Summit users only.

---

## 🎓 Learn More

- [Implementation Guide](./COPILOT_MVP_IMPLEMENTATION.md) - Deep dive into architecture
- [User Guide](./USER_GUIDE_AI_COPILOT.md) - Complete user manual
- [API Schema](../server/src/graphql/schema/copilot-mvp.graphql) - GraphQL API reference

---

**Version:** 1.0.0
**Last Updated:** 2025-11-20
**Maintainer:** Intelligence Systems Team
