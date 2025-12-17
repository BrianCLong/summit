# Service Catalog, Ownership & Capabilities Map

> **The living map of all services, capabilities, and owners in CompanyOS.**

Nobody ever asks "who owns this?" or "what does this service actually do?"—it's always in the catalog.

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [SERVICE_CATALOG_V0.md](./SERVICE_CATALOG_V0.md) | Catalog overview, vision, and roadmap |
| [SERVICE_CATALOG_DATA_MODEL.md](./SERVICE_CATALOG_DATA_MODEL.md) | Data model schema and entity definitions |
| [OWNERSHIP_PATTERNS.md](./OWNERSHIP_PATTERNS.md) | Ownership roles, accountability, and transfers |
| [SERVICE_ENTRY_TEMPLATE.yaml](./SERVICE_ENTRY_TEMPLATE.yaml) | Template for registering new services |
| [CATALOG_READY_CHECKLIST.md](./CATALOG_READY_CHECKLIST.md) | Checklist for service readiness by tier |
| [CAPABILITIES_MAP_UX.md](./CAPABILITIES_MAP_UX.md) | UX specifications for the capabilities map |

---

## Mission

Build the living map of all services, capabilities, and owners in CompanyOS:
- **Who owns what** → Clear ownership with accountability
- **What it does** → Service descriptions and capabilities
- **How it behaves** → SLOs, dependencies, and health status
- **How it's related** → Dependency graphs and blast radius

---

## Key Questions This Solves

| Question | Answer In |
|----------|-----------|
| "Who owns this service?" | Ownership tab (< 30 seconds) |
| "What does this service do?" | Description + capabilities |
| "What depends on this?" | Dependency graph |
| "What's the blast radius?" | Impact visualization |
| "Is this service healthy?" | SLO status overlay |
| "How do I contact the team?" | One-click to Slack/PagerDuty |
| "Where are the runbooks?" | Linked documentation |

---

## Core Entities

```
┌─────────────────────────────────────────────────────────────────┐
│                        CATALOG ENTITIES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────┐    owns      ┌───────────┐    depends    ┌───────┐
│  │OwnerGroup │─────────────▶│  Service  │─────────────▶│Service│
│  └───────────┘              └───────────┘              └───────┘
│        │                          │
│        │                          │ exposes
│        │                          ▼
│        │                    ┌───────────┐
│        │                    │ Interface │
│        │                    └───────────┘
│        │                          │
│        │                          │ implements
│        │                          ▼
│        │  accountable for   ┌───────────┐
│        └───────────────────▶│Capability │
│                             └───────────┘
│
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Tiers

| Tier | Count | SLO | On-Call | Requirements |
|------|-------|-----|---------|--------------|
| **Critical** | 14 | 99.9%+ | Required | All sections |
| **High** | 32 | 99.5%+ | Required | Sections 1-9 |
| **Medium** | 108 | 99%+ | Optional | Sections 1-5 |
| **Low** | 171 | Best-effort | No | Section 1 only |

---

## Capability Domains

- **Security & Compliance**: Authentication, authorization, audit, secrets, data protection
- **Data Management**: Graph storage, entity management, search, ingestion, data quality
- **Intelligence & Analytics**: Graph analytics, ML inference, copilot, reporting
- **Platform Infrastructure**: API gateway, orchestration, streaming, caching, config
- **Operations & Observability**: Monitoring, alerting, incidents, releases

---

## Getting Started

### Register a New Service

1. Copy [SERVICE_ENTRY_TEMPLATE.yaml](./SERVICE_ENTRY_TEMPLATE.yaml) to your service as `catalog.yaml`
2. Fill in all required fields for your tier
3. Run validation: `summit catalog validate --service=<id>`
4. Submit PR to register

### Check Catalog Readiness

```bash
# Validate your service
summit catalog validate --service=my-service --tier=high

# Generate readiness report
summit catalog validate --service=my-service --report=html > report.html
```

### Find Service Owner

```bash
# CLI
summit catalog owner graph-core

# Slack
/summit owner graph-core
```

---

## Implementation Roadmap

| Phase | Duration | Goals |
|-------|----------|-------|
| **Phase 1: Foundation** | Weeks 1-4 | Deploy backend, import services, basic UI |
| **Phase 2: Dependencies** | Weeks 5-8 | Map dependencies, capability taxonomy, visualizations |
| **Phase 3: Health** | Weeks 9-12 | SLO integration, real-time health, owner dashboards |
| **Phase 4: Governance** | Weeks 13-16 | Audit automation, transfer workflows, compliance |

---

## Related Resources

- [SERVICE_INVENTORY.md](/SERVICE_INVENTORY.md) - Current service inventory (325 services)
- [CODEOWNERS](/CODEOWNERS) - GitHub code ownership
- [docs/templates/SERVICE_CATALOG_TEMPLATE.md](/docs/templates/SERVICE_CATALOG_TEMPLATE.md) - Legacy template

---

## Contributing

1. Follow the [CATALOG_READY_CHECKLIST.md](./CATALOG_READY_CHECKLIST.md)
2. Use [SERVICE_ENTRY_TEMPLATE.yaml](./SERVICE_ENTRY_TEMPLATE.yaml) for new services
3. Keep ownership information current (review every 90 days)
4. Report issues to `#service-catalog-support`

---

## Contact

- **Slack**: `#service-catalog-support`
- **Email**: `platform-engineering@company.com`
- **Owner**: Platform Engineering Team
