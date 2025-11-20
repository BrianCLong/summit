# Summit Competitive Gap Assessment

**Date:** November 20, 2025
**Branch:** `claude/summit-competitive-analysis-011hfxsNVvNSqfYfUepMtK52`

## Executive Summary

Summit has **strong foundations in platform, governance, and orchestration**, but needs development in **last-mile UX, AI agent experiences, and GTM materials** to compete effectively with Finna, Notion, Dotwork, Leapsome, and Soom.

## Current State Assessment

### ✅ STRENGTHS (Production-Ready)

#### 1. Governance & Compliance
- **Multi-stage approval engine** (`/active-measures-module/src/approval/approvalEngine.ts`)
  - 4+ approval stages with role-based access
  - Risk assessment with conditional approvals
  - Legal/ethical review requirements
  - Compliance checking (NIST, SOX)
  - Delegation support
  - Complete audit trail

- **Policy-driven architecture** (20+ OPA/Rego policies)
  - ABAC (Attribute-Based Access Control)
  - Budget enforcement
  - Export controls
  - Tenant isolation
  - Classification-based access (UNCLASSIFIED → TOP SECRET → SCI → SAP)

- **Comprehensive audit system** (`/active-measures-module/src/audit/`)
  - All operations logged with classification
  - Actor identification and authentication tracking
  - Compliance status recording

#### 2. Orchestration & Workflows
- **Maestro orchestration engine** (`/packages/maestro-core/src/engine.ts`)
  - DAG execution with plugins
  - Retry, backoff, exponential retry
  - Compensation/rollback for failed steps
  - State and artifact persistence
  - Policy engine integration
  - Budget tracking per execution

- **Workflow engine** (`/apps/workflow-engine/`)
  - Full lifecycle management
  - Human task support with approvals
  - Built-in templates (data-processing, incident-response, approval)
  - Neo4j + PostgreSQL + Redis backends
  - Webhook triggers
  - Analytics and execution metrics

#### 3. Integration Infrastructure
- **17+ pre-built connectors** (`/connectors/`)
  - SIEM/XDR: Chronicle, Splunk, Sentinel
  - Threat Intel: STIX/TAXII
  - Collaboration: MISP
  - Geospatial: Esri, Mapbox
  - Data: DuckDB, CSV, JSON, RSS
  - Standardized IntelGraph entity mapping
  - Test suite for all connectors

- **Integration services** (`/services/integrations/`)
  - Bridge, eDiscovery, GIS, MISP, Productivity, SIEM-XDR, STIX-TAXII

#### 4. Knowledge Graph
- **Graph core** (`/services/graph-core/`)
  - Neo4j-backed knowledge graph
  - GraphQL API layer
  - Community detection, path finding, pattern matching algorithms
  - Graph analytics service
  - Standardized IntelGraph entity model

#### 5. Agent Orchestration
- **Agent orchestrator** (`/src/agents/index.ts`)
  - Multi-phase orchestration (Planning → Implementation → Testing → Review)
  - CriticAgent, FixerAgent implementations
  - Risk-based gating with auto-merge/approve/review decisions
  - Cost optimization (StrategicCounterAntifragileOrchestrationNetwork)

---

### ❌ CRITICAL GAPS (Competitive Disadvantages)

#### Gap 1: No Pre-Built Agent Archetypes
**Competitor Standard:**
- Dotwork: "Enterprise Agents" on operating ontology
- Soom: AI COO agent for project management
- Leapsome: AI analytics, meeting assistant, copilot
- Finna: AI agent connecting docs/CRM/product/ATS

**Summit Current State:**
- Agent orchestrator exists but no named, opinionated agents
- No "AI COO," "AI Chief of Staff," "AI RevOps" personas
- No pre-configured agent roles for business functions

**Risk:** Buyers expect named agents, not "build your own"

**Solution Required:**
- AI Chief of Staff: inbox triage, meeting prep, follow-ups
- AI COO: SLAs, incidents, process drift, approvals
- AI RevOps: pipeline sanity, forecast deltas, attribution, churn risk

---

#### Gap 2: No Visual Workflow Builder
**Competitor Standard:**
- Notion: Non-technical users build and extend
- Finna: No-code customization

**Summit Current State:**
- Workflow engine backend is production-ready
- Workflow schema and templates exist
- **Zero no-code/low-code UI**
- APIs and SDKs only (engineer-focused)

**Risk:** Perceived as "platform teams only," forcing Notion/Retool on top

**Solution Required:**
- Visual DAG composer with drag-and-drop
- Policy checkpoint integration
- Form/record builder for graph entities

---

#### Gap 3: No Policy Editor/Debugger UI
**Competitor Standard:**
- Notion: Visual permission builder
- Dotwork: Operating ontology with policy simulation

**Summit Current State:**
- 20+ OPA/Rego policies (production-grade)
- Policy engine integration works
- **Zero UI for editing, testing, or debugging policies**

**Risk:** Policy changes require engineers; limits operational agility

**Solution Required:**
- Policy studio with Rego editor
- Policy simulation/testing interface
- Visual ABAC rule builder

---

#### Gap 4: Incomplete "Work Hub" / Daily Workspace
**Competitor Standard:**
- Notion: Docs, wiki, projects, tasks, CRM all integrated
- Finna: Documents, CRM, product management, ATS pre-connected
- Leapsome: People OS with performance, goals, feedback

**Summit Current State:**
- Switchboard exists but incomplete (many endpoints return 501)
- Graph supports any entity type
- **No pre-built modules for tasks, projects, wiki, CRM, contacts**

**Risk:** Not the place people "live all day," leaving room for competitors

**Solution Required:**
- Work Hub with tasks, projects, wiki, CRM as graph-native entities
- Prebuilt layouts: "Founder cockpit," "Team OS," "Board pack"
- Integration between Switchboard and Work Hub

---

#### Gap 5: No Integration Management UI
**Competitor Standard:**
- Notion: Integration gallery with synced databases
- Dotwork: Schemaless integration layer with status monitoring

**Summit Current State:**
- 17+ connectors work
- Integration services deployed
- **No UI to view, configure, or monitor integrations**

**Risk:** Integration management requires DevOps; limits self-service

**Solution Required:**
- Integration gallery with health status, SLAs, policies
- Connector configuration UI
- Real-time sync status and error logs

---

#### Gap 6: No "Operating Model Packs" / Vertical Solutions
**Competitor Standard:**
- Notion: Templates for agencies, SaaS, creators
- Leapsome: Deep verticalization around People/HR
- Dotwork: Strategy/portfolio/product ops with SAFe architectures

**Summit Current State:**
- Generic capabilities (graph, workflows, policies)
- No explicit vertical packs
- **Every deployment looks like consulting project**

**Risk:** Long time-to-value; custom work required for each customer

**Solution Required:**
- Operating Model Packs per function (RevOps, People, Eng, Finance)
- Pre-configured entities, policies, dashboards, runbooks
- Sample data and documentation
- Packaged as SKUs

---

#### Gap 7: All GTM Materials Missing
**Competitor Standard:**
- Dotwork: Public SOC 2, partner program, case studies
- Notion: Pricing page, templates gallery, case studies
- Leapsome: Trust center, GDPR compliance, AI principles

**Summit Current State:**
- Excellent internal documentation
- **Zero external-facing materials:**
  - No pricing page
  - No case studies
  - No reference architectures
  - No trust center
  - No compliance certifications (SOC 2, ISO 27001)

**Risk:** Looks like internal platform, not category leader

**Solution Required:**
- Public pricing/editions page
- Trust Center v0: uptime, security stance, AI data handling
- Reference architectures
- 2-3 case studies (even if internal dogfooding)

---

## Gap Prioritization Matrix

| Gap | Impact | Effort | Priority | Timeline |
|-----|--------|--------|----------|----------|
| Pre-built agent archetypes | HIGH | MEDIUM | **P0** | Week 1-2 |
| Visual workflow builder | HIGH | HIGH | **P1** | Week 3-5 |
| Integration management UI | MEDIUM | MEDIUM | **P1** | Week 3-4 |
| GTM materials (pricing, trust center) | HIGH | LOW | **P1** | Week 1-2 |
| Work Hub modules | HIGH | HIGH | **P2** | Week 5-8 |
| Policy editor UI | MEDIUM | MEDIUM | **P2** | Week 6-7 |
| Operating Model Packs | HIGH | HIGH | **P2** | Week 8-12 |

---

## Implementation Roadmap

### Phase 1: Quick Wins (Weeks 1-2)
1. **Pre-built agent archetypes** (AI COO, Chief of Staff, RevOps)
   - Leverage existing agent orchestrator
   - Define agent schemas and capabilities
   - Wire into Switchboard
   - Add guardrails and audit trails

2. **GTM materials**
   - Public pricing page structure
   - Trust Center v0 (security stance, AI principles)
   - Reference architecture diagrams
   - First case study (internal dogfooding)

### Phase 2: No-Code/Low-Code (Weeks 3-5)
3. **Visual workflow builder**
   - DAG composer UI
   - Policy checkpoint integration
   - Form/record builder

4. **Integration management UI**
   - Integration gallery
   - Health monitoring dashboard
   - Connector configuration

### Phase 3: Daily Workspace (Weeks 5-8)
5. **Work Hub modules**
   - Tasks, projects, wiki, CRM as graph entities
   - Switchboard integration
   - Prebuilt layouts

6. **Policy editor UI**
   - Rego editor with syntax highlighting
   - Policy simulation/testing
   - Visual ABAC rule builder

### Phase 4: Vertical Solutions (Weeks 8-12)
7. **Operating Model Packs**
   - Pick strongest internal function (RevOps or Eng)
   - Pre-configured entities, policies, dashboards, runbooks
   - Sample data and documentation
   - Package as SKU

---

## Success Metrics

### Product Metrics
- [ ] 3+ named agent archetypes shipped and documented
- [ ] Visual workflow builder allows non-engineer to create workflow in <10 min
- [ ] Integration gallery shows health status for all 17+ connectors
- [ ] Work Hub has 4+ modules (tasks, projects, wiki, CRM)
- [ ] 1+ Operating Model Pack fully documented and demoed

### GTM Metrics
- [ ] Public pricing page live
- [ ] Trust Center v0 published with security stance
- [ ] 2+ reference architectures documented
- [ ] 1+ case study published
- [ ] Competitive positioning doc shared with team

### Technical Metrics
- [ ] <5 sec p95 latency for agent responses
- [ ] 99.9% uptime for workflow engine
- [ ] Integration sync latency <30 sec for real-time connectors
- [ ] Policy evaluation <100ms p95
- [ ] Zero security vulnerabilities in new code

---

## File Locations Reference

### Core Systems (Production-Ready)
- **Agents:** `/src/agents/index.ts`, `/src/agents/critic.ts`, `/src/agents/fixer.ts`
- **Workflows:** `/apps/workflow-engine/src/`, `/packages/maestro-core/src/engine.ts`
- **Approvals:** `/active-measures-module/src/approval/approvalEngine.ts`
- **Policies:** `/policies/`, `/opa/`
- **Audit:** `/active-measures-module/src/audit/auditEngine.ts`
- **Connectors:** `/connectors/`, `/services/integrations/`
- **Graph:** `/services/graph-core/`, `/apps/graph-analytics/`

### UI (Needs Development)
- **Switchboard:** `/october2025/companyos-switchboard/apps/web/src/components/Switchboard.tsx`
- **Web App:** `/apps/web/src/`
- **Conductor:** `/apps/web/src/components/conductor/`

### Documentation
- **User Docs:** `/docs/`
- **API Docs:** Various schema files

---

## Next Steps

1. **Immediate (Today):**
   - Create agent architecture design doc
   - Design agent schemas (COO, Chief of Staff, RevOps)
   - Draft public pricing page

2. **This Week:**
   - Implement AI Chief of Staff agent
   - Implement AI COO agent
   - Implement AI RevOps agent
   - Write Trust Center v0
   - Create first reference architecture

3. **Next Week:**
   - Design visual workflow builder UI
   - Design integration gallery UI
   - Start Work Hub entity modeling

---

## Conclusion

Summit has **production-ready infrastructure** but needs **last-mile UX and GTM polish** to compete. The gaps are **implementable in 8-12 weeks** with focused execution. Priority 1 items (agent archetypes + GTM materials) can ship in **2 weeks** to immediately improve competitive positioning.

**Key Insight:** We're not rebuilding—we're **surfacing existing capabilities** through better UX and packaging.
