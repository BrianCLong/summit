# Capabilities Map UX Specifications

> **Version:** 1.0.0
> **Last Updated:** 2025-12-07
> **Status:** Draft
> **Owner:** Platform Engineering + UX Team

This document specifies the user experience design for the Capabilities Map—the visual interface where users explore services, capabilities, dependencies, and health status.

---

## Table of Contents

1. [Design Goals](#design-goals)
2. [Information Architecture](#information-architecture)
3. [Primary Views](#primary-views)
4. [Interaction Patterns](#interaction-patterns)
5. [Visual Design](#visual-design)
6. [Search & Filtering](#search--filtering)
7. [Health Overlays](#health-overlays)
8. [Mobile & Accessibility](#mobile--accessibility)
9. [Wireframes](#wireframes)

---

## Design Goals

### Primary Goals

| Goal | Metric | Target |
|------|--------|--------|
| **Find owner in < 30 seconds** | Time to answer "who owns X?" | < 30s |
| **Understand dependencies** | Time to identify critical deps | < 60s |
| **Assess blast radius** | Time to see impact of failure | < 45s |
| **Check health status** | Time to see if service is healthy | < 10s |

### User Personas

```yaml
personas:

  on_call_engineer:
    name: "On-Call Engineer"
    goal: "Quickly identify owner and runbook during incident"
    key_tasks:
      - Find owner contact info
      - Access runbooks
      - See dependencies
      - Check health status
    pain_points:
      - Multiple systems to check
      - Stale contact info
      - Missing runbooks

  platform_engineer:
    name: "Platform Engineer"
    goal: "Understand service landscape and plan changes"
    key_tasks:
      - Map dependencies
      - Assess blast radius
      - Find similar services
      - Review architecture
    pain_points:
      - No single source of truth
      - Outdated documentation
      - Hidden dependencies

  engineering_manager:
    name: "Engineering Manager"
    goal: "Understand team's service portfolio and health"
    key_tasks:
      - See all services owned by team
      - Review SLO compliance
      - Track error budgets
      - Plan ownership transfers
    pain_points:
      - Scattered ownership info
      - Manual tracking of SLOs
      - No portfolio view

  new_engineer:
    name: "New Team Member"
    goal: "Learn the service landscape quickly"
    key_tasks:
      - Explore capabilities
      - Understand architecture
      - Find documentation
      - Identify who to ask
    pain_points:
      - Overwhelming complexity
      - Tribal knowledge
      - No guided onboarding
```

---

## Information Architecture

### Site Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE CATALOG                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  HOME                                                            │
│  ├── Quick Search                                               │
│  ├── Health Summary (critical services)                         │
│  └── Recent Activity                                            │
│                                                                  │
│  CAPABILITIES MAP                                                │
│  ├── Domain View (Security, Data, Intelligence, etc.)           │
│  ├── Capability Detail                                          │
│  │   ├── Description                                            │
│  │   ├── Primary Service                                        │
│  │   ├── Supporting Services                                    │
│  │   └── Health Status                                          │
│  └── Service Mapping Matrix                                     │
│                                                                  │
│  SERVICE DIRECTORY                                               │
│  ├── Service List (filterable)                                  │
│  ├── Service Detail                                             │
│  │   ├── Overview                                               │
│  │   ├── Ownership                                              │
│  │   ├── Dependencies                                           │
│  │   ├── Interfaces                                             │
│  │   ├── SLOs & Health                                          │
│  │   └── Documentation                                          │
│  └── Compare Services                                           │
│                                                                  │
│  DEPENDENCY GRAPH                                                │
│  ├── Full Graph View                                            │
│  ├── Service-centric View                                       │
│  ├── Blast Radius Calculator                                    │
│  └── Path Finder                                                │
│                                                                  │
│  OWNER DIRECTORY                                                 │
│  ├── Team List                                                  │
│  ├── Team Detail                                                │
│  │   ├── Services Owned                                         │
│  │   ├── Capabilities                                           │
│  │   ├── On-Call Schedule                                       │
│  │   └── Contact Info                                           │
│  └── Org Chart Integration                                      │
│                                                                  │
│  HEALTH DASHBOARD                                                │
│  ├── System-wide Health                                         │
│  ├── Tier-based View                                            │
│  ├── Error Budget Status                                        │
│  └── SLO Compliance                                             │
│                                                                  │
│  ADMIN                                                           │
│  ├── Service Registration                                       │
│  ├── Ownership Transfer                                         │
│  ├── Audit Log                                                  │
│  └── Data Quality Reports                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### URL Structure

```
/catalog                           # Home/Dashboard
/catalog/capabilities              # Capabilities map
/catalog/capabilities/:domain      # Domain view (e.g., /capabilities/security)
/catalog/capabilities/:id          # Capability detail

/catalog/services                  # Service directory
/catalog/services/:id              # Service detail
/catalog/services/:id/deps         # Service dependencies
/catalog/services/:id/health       # Service health

/catalog/graph                     # Dependency graph
/catalog/graph?focus=:service-id   # Service-centric graph
/catalog/graph/blast-radius/:id    # Blast radius view

/catalog/owners                    # Owner directory
/catalog/owners/:id                # Team detail
/catalog/owners/:id/services       # Team's services

/catalog/health                    # Health dashboard
/catalog/health/slos               # SLO compliance
/catalog/health/budgets            # Error budgets
```

---

## Primary Views

### 1. Capabilities Map View

The default landing experience—a visual map of business capabilities.

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Search services, capabilities, owners...        [Filter ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    SECURITY     │  │      DATA       │  │  INTELLIGENCE   │  │
│  │    & COMPLIANCE │  │   MANAGEMENT    │  │   & ANALYTICS   │  │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  │
│  │ 🟢 Auth         │  │ 🟢 Graph Store  │  │ 🟢 Analytics    │  │
│  │ 🟢 Authorization│  │ 🟢 Entity Mgmt  │  │ 🟡 ML Inference │  │
│  │ 🟢 Audit        │  │ 🟢 Search       │  │ 🟢 Copilot      │  │
│  │ 🟢 Secrets      │  │ 🟡 Ingestion    │  │ 🟢 Graph Anlytcs│  │
│  │ 🟢 Data Protect │  │ 🟢 Data Quality │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │    PLATFORM     │  │   OPERATIONS    │                       │
│  │ INFRASTRUCTURE  │  │ & OBSERVABILITY │                       │
│  ├─────────────────┤  ├─────────────────┤                       │
│  │ 🟢 API Gateway  │  │ 🟢 Observability│                       │
│  │ 🟢 Orchestration│  │ 🟢 Alerting     │                       │
│  │ 🟢 Streaming    │  │ 🟢 Incidents    │                       │
│  │ 🟢 Caching      │  │ 🟢 Releases     │                       │
│  │ 🟢 Config       │  │                 │                       │
│  └─────────────────┘  └─────────────────┘                       │
│                                                                  │
│  Legend: 🟢 Healthy  🟡 Degraded  🔴 Down  ⚪ Unknown            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click capability → Capability detail panel
- Hover capability → Quick stats tooltip
- Click domain header → Expand/collapse
- Color indicates health status (real-time)

### 2. Service Detail View

Deep-dive into a single service.

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Services            graph-core           🟢 Healthy  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Overview ─────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  Graph Core Service                                         │ │
│  │  Provides GraphQL API for Neo4j graph database operations   │ │
│  │  including entity/relationship CRUD and analytics queries.  │ │
│  │                                                             │ │
│  │  Type: api    Tier: critical    Lifecycle: ga               │ │
│  │  Language: TypeScript    Runtime: Node.js 20                │ │
│  │                                                             │ │
│  │  [📄 Docs]  [📕 Runbook]  [📊 Dashboard]  [💻 Code]         │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Ownership ────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  Primary Owner     platform-engineering                     │ │
│  │  Backup Owner      data-engineering                         │ │
│  │  On-Call           @jane-doe (ends in 4h)                   │ │
│  │                                                             │ │
│  │  [💬 Slack #platform-eng]  [📧 Email]  [🚨 Page]            │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ SLOs ─────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  Availability    ████████████████████░░  99.95% / 99.9%     │ │
│  │  Latency (P95)   ██████████████░░░░░░░░  180ms / 200ms      │ │
│  │  Error Rate      █░░░░░░░░░░░░░░░░░░░░░  0.05% / 0.1%       │ │
│  │                                                             │ │
│  │  Error Budget: 38.5 min remaining (89%)  [View Details →]   │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Dependencies ─────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  Upstream (this service calls):                             │ │
│  │  🟢 neo4j          data      critical    [View →]           │ │
│  │  🟢 redis          data      non-critical [View →]          │ │
│  │  🟢 kafka          async     non-critical [View →]          │ │
│  │                                                             │ │
│  │  Downstream (calls this service):                           │ │
│  │  🟢 api-gateway    GraphQL consumers: 12                    │ │
│  │  🟢 copilot        Graph queries                            │ │
│  │  🟢 analytics      Analytics pipeline                       │ │
│  │                                                             │ │
│  │  [🔍 View Dependency Graph]  [💥 Blast Radius]              │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Dependency Graph View

Interactive visualization of service dependencies.

```
┌─────────────────────────────────────────────────────────────────┐
│  Dependency Graph                    [Filters ▼]  [Layout ▼]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│              ┌─────────┐                                        │
│              │api-gate │                                        │
│              │   way   │                                        │
│              └────┬────┘                                        │
│                   │                                              │
│        ┌──────────┼──────────┐                                  │
│        │          │          │                                  │
│        ▼          ▼          ▼                                  │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│   │  authz  │ │ graph-  │ │ search  │                          │
│   │ gateway │ │  core   │ │   api   │                          │
│   └────┬────┘ └────┬────┘ └────┬────┘                          │
│        │          │ │          │                                │
│        │     ┌────┘ └────┐     │                                │
│        │     │           │     │                                │
│        ▼     ▼           ▼     ▼                                │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│   │   opa   │ │  neo4j  │ │  redis  │                          │
│   └─────────┘ └─────────┘ └─────────┘                          │
│                     │                                            │
│                     ▼                                            │
│               ┌─────────┐                                        │
│               │postgres │                                        │
│               └─────────┘                                        │
│                                                                  │
│  ─── Critical dependency                                        │
│  --- Non-critical dependency                                    │
│  🟢 Healthy  🟡 Degraded  🔴 Down                                │
│                                                                  │
│  Selected: graph-core                                           │
│  Upstream: 3 services | Downstream: 5 services                  │
│  [Center on Selection]  [Expand All]  [Show Blast Radius]       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Graph Interactions:**
- Click node → Select and show details
- Double-click → Navigate to service detail
- Drag node → Reposition
- Scroll → Zoom in/out
- Click edge → Show dependency details
- Hover → Highlight path

### 4. Blast Radius View

Visualize impact of a service failure.

```
┌─────────────────────────────────────────────────────────────────┐
│  Blast Radius: graph-core                          [Export PDF] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  If graph-core fails:                                           │
│                                                                  │
│  ┌─ Direct Impact (5 services) ───────────────────────────────┐ │
│  │                                                             │ │
│  │  🔴 api-gateway         critical    All graph queries fail  │ │
│  │  🔴 copilot             high        AI context unavailable  │ │
│  │  🔴 analytics-engine    high        Reports fail            │ │
│  │  🟡 search-api          high        Degraded (fallback)     │ │
│  │  🟡 data-quality        medium      Quality checks fail     │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Cascading Impact (8 services) ────────────────────────────┐ │
│  │                                                             │ │
│  │  Through api-gateway:                                       │ │
│  │  🔴 web-app             All UI graph features               │ │
│  │  🔴 mobile-api          Mobile graph features               │ │
│  │  🟡 external-api        External integrations               │ │
│  │                                                             │ │
│  │  Through copilot:                                           │ │
│  │  🟡 analyst-assist      AI recommendations                  │ │
│  │  🟡 auto-triage         Auto-classification                 │ │
│  │                                                             │ │
│  │  Through analytics-engine:                                  │ │
│  │  🟡 dashboard-service   Dashboard data                      │ │
│  │  🟡 report-generator    Scheduled reports                   │ │
│  │  🟡 alert-enrichment    Alert context                       │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Business Impact ──────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  Capabilities Affected:                                     │ │
│  │  • Graph Storage & Queries (PRIMARY - total outage)         │ │
│  │  • Entity Management (total outage)                         │ │
│  │  • AI Copilot (degraded)                                    │ │
│  │  • Analytics & Reporting (degraded)                         │ │
│  │                                                             │ │
│  │  Estimated User Impact: ~5,000 users affected               │ │
│  │  Revenue Impact: High (core functionality)                  │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [📋 Copy Impact Report]  [📧 Share with Stakeholders]          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Owner Dashboard View

Team-centric view of owned services.

```
┌─────────────────────────────────────────────────────────────────┐
│  Team: platform-engineering                        [Settings ⚙] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Team Overview ────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  Services Owned: 12    Capabilities: 5    On-Call: @jane   │ │
│  │  Overall Health: 🟢 11 healthy  🟡 1 degraded  🔴 0 down    │ │
│  │                                                             │ │
│  │  [💬 #platform-eng]  [📧 platform@company.com]  [📅 PD]     │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Services ─────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  Service          Tier      Health   SLO      Error Budget │ │
│  │  ─────────────────────────────────────────────────────────  │ │
│  │  graph-core       critical  🟢       99.95%   89% ████░    │ │
│  │  api-gateway      critical  🟢       99.98%   95% █████    │ │
│  │  graph-api        high      🟡       99.42%   65% ███░░    │ │
│  │  config-service   critical  🟢       99.99%   98% █████    │ │
│  │  notification-svc medium    🟢       99.85%   n/a          │ │
│  │  ...                                                        │ │
│  │                                                             │ │
│  │  [View All Services →]                                      │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Action Items ─────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  ⚠️  graph-api SLO at risk (65% error budget)              │ │
│  │  📋 Ownership review due for notification-svc (in 5 days)   │ │
│  │  📄 Runbook missing for config-service                      │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Recent Incidents ─────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  Dec 5  graph-api latency spike (resolved)     25min        │ │
│  │  Dec 1  api-gateway deploy rollback (resolved) 15min        │ │
│  │  Nov 28 config-service connection leak (resolved) 45min     │ │
│  │                                                             │ │
│  │  [View All Incidents →]                                     │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Interaction Patterns

### Global Search

Omnisearch that finds services, capabilities, owners, and documentation.

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 graph                                                   ⌘K  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Services                                                        │
│  ├─ graph-core         Graph Core Service          critical     │
│  ├─ graph-api          Graph API Service           high         │
│  └─ graph-xai          Graph Explainability        medium       │
│                                                                  │
│  Capabilities                                                    │
│  ├─ graph-storage      Graph Storage & Queries                  │
│  └─ graph-analytics    Graph Analytics                          │
│                                                                  │
│  Documentation                                                   │
│  ├─ Graph Query Guide                                           │
│  └─ Graph Schema Reference                                      │
│                                                                  │
│  Owners                                                          │
│  └─ graph-team         (no exact match, showing similar)        │
│                                                                  │
│  [↑↓ Navigate]  [Enter Select]  [Esc Close]                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Actions

Context-sensitive actions available throughout the UI.

| Context | Quick Actions |
|---------|--------------|
| Service | Page Owner, View Runbook, Open Dashboard, View Code |
| Capability | See Services, Contact Owner, View Docs |
| Owner | Slack, Email, View Services |
| Health Alert | View Runbook, Page On-Call, Open Incident |

### Keyboard Shortcuts

```
Global:
⌘K / Ctrl+K     Open search
⌘/ / Ctrl+/     Show keyboard shortcuts
Esc             Close panel/modal

Navigation:
g h             Go to home
g c             Go to capabilities
g s             Go to services
g d             Go to dependency graph
g o             Go to owners

Service Detail:
o               Open owner panel
d               Open dependencies
r               Open runbook
m               Open metrics/dashboard
```

---

## Visual Design

### Color System

```yaml
colors:
  # Health status
  health_green: "#22C55E"     # Healthy
  health_yellow: "#F59E0B"    # Degraded
  health_red: "#EF4444"       # Down
  health_gray: "#9CA3AF"      # Unknown

  # Service tiers
  tier_critical: "#7C3AED"    # Purple
  tier_high: "#3B82F6"        # Blue
  tier_medium: "#10B981"      # Teal
  tier_low: "#6B7280"         # Gray

  # Domains
  domain_security: "#DC2626"
  domain_data: "#2563EB"
  domain_intelligence: "#7C3AED"
  domain_platform: "#059669"
  domain_operations: "#D97706"

  # UI
  background: "#FFFFFF"
  surface: "#F9FAFB"
  border: "#E5E7EB"
  text_primary: "#111827"
  text_secondary: "#6B7280"
```

### Typography

```yaml
typography:
  font_family: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
  font_mono: "JetBrains Mono, Menlo, monospace"

  sizes:
    h1: "24px / 32px"
    h2: "20px / 28px"
    h3: "16px / 24px"
    body: "14px / 20px"
    small: "12px / 16px"
    code: "13px / 20px"
```

### Icons

Use Lucide icons for consistency:

| Concept | Icon |
|---------|------|
| Service | `server` |
| Capability | `layers` |
| Owner | `users` |
| Health | `heart-pulse` |
| Dependency | `git-branch` |
| Documentation | `file-text` |
| Runbook | `book-open` |
| Dashboard | `bar-chart-2` |
| Alert | `bell` |
| Search | `search` |

---

## Search & Filtering

### Filter Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  Filters                                           [Clear All]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tier                                                            │
│  [x] Critical (14)  [x] High (32)  [ ] Medium  [ ] Low          │
│                                                                  │
│  Lifecycle                                                       │
│  [x] GA (298)  [ ] Beta  [ ] Experimental  [ ] Deprecated       │
│                                                                  │
│  Health                                                          │
│  [x] Healthy  [x] Degraded  [ ] Down  [ ] Unknown               │
│                                                                  │
│  Domain                                                          │
│  [ ] Security  [x] Data  [ ] Intelligence  [ ] Platform         │
│                                                                  │
│  Owner                                                           │
│  [Select team...]                                          ▼     │
│                                                                  │
│  Tags                                                            │
│  [core] [api] [x]                                               │
│                                                                  │
│  [Apply Filters]                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Saved Filters

Users can save filter combinations:

- "My Team's Services" - `owner:platform-engineering`
- "Critical Unhealthy" - `tier:critical health:degraded,down`
- "Security Services" - `domain:security`

---

## Health Overlays

### Real-time Health Indicators

Health status updates in real-time via WebSocket:

```yaml
health_overlay:
  update_frequency: 30s

  indicators:
    service_node:
      healthy: "Green border, filled icon"
      degraded: "Yellow border, pulsing"
      down: "Red border, alarm animation"
      unknown: "Gray border, dashed"

    capability_card:
      all_healthy: "Green header bar"
      some_degraded: "Yellow header bar"
      any_down: "Red header bar"

    list_row:
      healthy: "🟢"
      degraded: "🟡"
      down: "🔴"
      unknown: "⚪"
```

### Health Tooltip

Hover over health indicator shows details:

```
┌─────────────────────────────────────┐
│  graph-core Health                  │
├─────────────────────────────────────┤
│                                     │
│  Status: Healthy 🟢                 │
│  Uptime: 99.95% (last 30d)         │
│                                     │
│  Availability   ██████████░ 99.95% │
│  Latency (P95)  ████████░░  180ms  │
│  Error Rate     █░░░░░░░░░  0.05%  │
│                                     │
│  Last incident: 5 days ago          │
│  [View Dashboard →]                 │
│                                     │
└─────────────────────────────────────┘
```

---

## Mobile & Accessibility

### Responsive Design

| Breakpoint | Layout |
|------------|--------|
| Desktop (>1200px) | Full layout with sidebars |
| Tablet (768-1200px) | Collapsible sidebar, smaller graph |
| Mobile (<768px) | Stack layout, list view only |

### Accessibility Requirements

- **WCAG 2.1 AA compliance**
- All interactive elements keyboard accessible
- Screen reader support with ARIA labels
- Color not sole indicator (icons + color)
- Sufficient color contrast (4.5:1 minimum)
- Focus indicators visible
- Skip to main content link

### Accessibility Features

```yaml
accessibility:
  keyboard_navigation: true
  screen_reader_support: true
  high_contrast_mode: true
  reduced_motion_option: true

  aria_labels:
    - "Health status: healthy"
    - "Service tier: critical"
    - "Navigate to service detail"

  focus_management:
    - Trap focus in modals
    - Return focus after modal close
    - Visible focus ring (2px blue outline)
```

---

## Wireframes

### Capabilities Map - Desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌─ Header ─────────────────────────────────────────────────────────────────┐ │
│ │  🏠 Service Catalog    Capabilities  Services  Graph  Owners    🔍  👤   │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─ Sidebar ────┐ ┌─ Main Content ────────────────────────────────────────┐  │
│ │              │ │                                                        │  │
│ │  Domains     │ │  ┌────────────────┐  ┌────────────────┐               │  │
│ │  ──────────  │ │  │   SECURITY     │  │     DATA       │               │  │
│ │  ○ All       │ │  │  🟢 Auth       │  │  🟢 Graph      │               │  │
│ │  ● Security  │ │  │  🟢 Authz      │  │  🟢 Entity     │               │  │
│ │  ○ Data      │ │  │  🟢 Audit      │  │  🟡 Ingest     │               │  │
│ │  ○ Intel     │ │  └────────────────┘  └────────────────┘               │  │
│ │  ○ Platform  │ │                                                        │  │
│ │  ○ Ops       │ │  ┌────────────────┐  ┌────────────────┐               │  │
│ │              │ │  │  INTELLIGENCE  │  │   PLATFORM     │               │  │
│ │  Filters     │ │  │  🟢 Analytics  │  │  🟢 Gateway    │               │  │
│ │  ──────────  │ │  │  🟢 Copilot    │  │  🟢 Orchestr   │               │  │
│ │  Tier ▼      │ │  └────────────────┘  └────────────────┘               │  │
│ │  Health ▼    │ │                                                        │  │
│ │  Owner ▼     │ │                                                        │  │
│ │              │ │                                                        │  │
│ └──────────────┘ └────────────────────────────────────────────────────────┘  │
│                                                                              │
│ ┌─ Footer ─────────────────────────────────────────────────────────────────┐ │
│ │  Last updated: 2 min ago    Services: 325    Healthy: 320    ⚠️ 5       │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Service Detail - Mobile

```
┌────────────────────────┐
│ ← graph-core      🟢   │
├────────────────────────┤
│                        │
│  Graph Core Service    │
│  Tier: critical        │
│                        │
│  ┌──────────────────┐  │
│  │ 👥 Owner         │  │
│  │ platform-eng     │  │
│  │ [Slack] [Page]   │  │
│  └──────────────────┘  │
│                        │
│  ┌──────────────────┐  │
│  │ 📊 SLOs          │  │
│  │ Avail: 99.95%    │  │
│  │ P95: 180ms       │  │
│  │ Errors: 0.05%    │  │
│  └──────────────────┘  │
│                        │
│  ┌──────────────────┐  │
│  │ 🔗 Dependencies  │  │
│  │ neo4j (critical) │  │
│  │ redis            │  │
│  │ kafka            │  │
│  └──────────────────┘  │
│                        │
│  [📄 Docs] [📕 Runbook]│
│                        │
├────────────────────────┤
│ 🏠  📋  🔍  👤         │
└────────────────────────┘
```

---

## Implementation Notes

### Technology Stack

```yaml
frontend:
  framework: React 18
  state: Zustand
  routing: React Router v6
  styling: Tailwind CSS
  components: Radix UI primitives
  charts: Recharts
  graph: React Flow (dependency graph)

api:
  protocol: GraphQL
  client: Apollo Client
  subscriptions: WebSocket (health updates)

performance:
  code_splitting: true
  lazy_loading: true
  cache: Apollo cache + IndexedDB
  service_worker: true
```

### Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Largest Contentful Paint | < 2.5s |
| Search response | < 200ms |
| Graph render (100 nodes) | < 500ms |
| Health update latency | < 1s |

---

## Related Documents

- [SERVICE_CATALOG_V0.md](./SERVICE_CATALOG_V0.md) - Catalog overview
- [SERVICE_CATALOG_DATA_MODEL.md](./SERVICE_CATALOG_DATA_MODEL.md) - Data model
- [OWNERSHIP_PATTERNS.md](./OWNERSHIP_PATTERNS.md) - Ownership rules
- [CATALOG_READY_CHECKLIST.md](./CATALOG_READY_CHECKLIST.md) - Readiness criteria
