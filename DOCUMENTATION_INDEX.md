# IntelGraph Architecture Documentation Index

This directory contains comprehensive documentation about the IntelGraph codebase architecture, designed to guide the development of the advanced visualization dashboard system.

## Documentation Files

### 1. **ARCHITECTURE_SUMMARY.md** (24KB)
Comprehensive technical overview of the entire system architecture.

**Covers:**
- Complete package organization (60+ packages)
- Frontend architecture (React 18, Redux, Apollo, real-time)
- Backend architecture (Express, GraphQL, Neo4j, PostgreSQL)
- 4 main visualization implementation types
- WebSocket and real-time features
- API patterns and conventions
- Multi-database strategy
- Shared libraries and utilities
- Architectural patterns and best practices
- Observability and monitoring setup
- Deployment and infrastructure

**When to use:**
- Getting deep understanding of system components
- Understanding how different layers interact
- Learning about existing implementations
- Reference for architectural decisions

### 2. **VISUALIZATION_DEVELOPMENT_GUIDE.md** (12KB)
Practical step-by-step guide for building new visualizations.

**Covers:**
- Frontend component templates with full code
- Redux slice patterns for state management
- GraphQL schema additions (type defs, resolvers, subscriptions)
- Backend service class patterns
- Real-time WebSocket event integration
- Library selection guide
- Data flow patterns
- File organization conventions
- Type safety with Zod
- Testing patterns
- Performance optimization techniques
- Deployment checklist
- Common pitfalls to avoid

**When to use:**
- Building new visualization components
- Understanding the tech stack choices
- Setting up real-time updates
- Following existing conventions
- Reference while coding

### 3. **QUICK_REFERENCE.md** (8KB)
Quick lookup guide for common tasks and patterns.

**Covers:**
- Critical file locations (frontend, backend, packages)
- Technology stack at-a-glance table
- Key architectural patterns
- Common code snippets for quick copy-paste
- Authentication and authorization details
- Database querying examples
- Performance considerations
- Environment variables setup
- Testing commands
- Monitoring endpoints
- Common tasks checklist
- Troubleshooting guide

**When to use:**
- Quick lookup of file locations
- Copy-paste code snippets
- Quick reference during development
- Troubleshooting issues
- Finding monitoring endpoints

### 4. **ops/production-deployment-runbook.md**
Step-by-step production promotion runbook covering pre-checks, staging parity, rollout/rollback commands, and evidence collection requirements.

**When to use:**
- Executing a production deployment with auditable steps
- Capturing smoke/health output for the release ticket
- Enforcing persisted queries and rate limits during rollout

### 5. **ops/production-readiness-validation.md**
Validation plan that turns the identified production gaps into actionable tests (performance, security, backup/DR, observability, E2E workflows) with acceptance criteria.

**When to use:**
- Planning a production readiness audit
- Running load, DR, and security validation with expected outcomes
- Preparing evidence for go/no-go decisions

## Quick Navigation

### I want to understand...
- **How the entire system works** → ARCHITECTURE_SUMMARY.md (full document)
- **How to build a visualization** → VISUALIZATION_DEVELOPMENT_GUIDE.md (full document)
- **Where to find a specific file** → QUICK_REFERENCE.md (Critical File Locations)
- **How real-time updates work** → ARCHITECTURE_SUMMARY.md (Section 5)
- **What databases are used** → ARCHITECTURE_SUMMARY.md (Section 7)
- **How to connect to Redux** → QUICK_REFERENCE.md (Common Code Snippets)

### I want to...
- **Add a new visualization type** → VISUALIZATION_DEVELOPMENT_GUIDE.md (sections 1-5)
- **Set up real-time updates** → VISUALIZATION_DEVELOPMENT_GUIDE.md (Section 6)
- **Find a specific service** → QUICK_REFERENCE.md (Critical File Locations) or ARCHITECTURE_SUMMARY.md (Section 3)
- **Query the database** → QUICK_REFERENCE.md (Database Querying)
- **Test my code** → VISUALIZATION_DEVELOPMENT_GUIDE.md (Testing Pattern) or QUICK_REFERENCE.md (Testing)
- **Deploy to production** → QUICK_REFERENCE.md (Release & Deployment)

## Key Statistics

- **Frontend Components**: 64+ component directories
- **Backend Services**: 150+ domain-specific services
- **Packages**: 60+ reusable packages in monorepo
- **Visualization Types**: 4 main categories (graph, advanced, dashboard, timeline)
- **Database Connections**: 4 databases (Neo4j, PostgreSQL, Redis, TimescaleDB)
- **Frontend Tech Stack**: React 18, Redux Toolkit, Apollo Client, Cytoscape, D3, Leaflet
- **Backend Tech Stack**: Express, Apollo Server, uWebSockets, OpenTelemetry

## Technology Highlights

### Frontend
- React 18.3.1 with TypeScript
- Redux Toolkit for predictable state management
- Apollo Client for GraphQL data management
- Cytoscape.js for network graphs
- D3.js for custom visualizations
- Leaflet for maps
- Socket.io for real-time updates
- MUI + Emotion for consistent styling

### Backend
- Express 5.1.0 with TypeScript
- Apollo Server 5.1.0 for GraphQL
- uWebSockets.js for high-performance WebSocket
- Neo4j 5.15 for graph storage
- PostgreSQL 15 for relational data
- Redis 7 for caching and real-time
- OpenTelemetry for observability

## Architecture Patterns Used

1. **Redux for State Management**
   - Centralized state store
   - Slices for domain organization
   - Selectors for derived state

2. **Feature Module Pattern**
   - Self-contained feature directories
   - Includes components, hooks, services, types
   - Easy to add/remove features

3. **GraphQL for API**
   - Strongly typed schema
   - Subscriptions for real-time
   - Apollo Server with plugins

4. **Service Class Pattern**
   - Domain-focused business logic
   - Database abstraction
   - Event emission

5. **Repository Pattern**
   - Data access abstraction
   - Consistent query interface
   - Easy to test

6. **Real-time with Socket.io & Subscriptions**
   - Socket.io for immediate events
   - GraphQL subscriptions for structured data
   - Redis pub/sub for scaling

## Development Workflow

1. **Design**: Plan visualization in ARCHITECTURE_SUMMARY.md context
2. **Setup**: Use templates from VISUALIZATION_DEVELOPMENT_GUIDE.md
3. **Implement**: Follow patterns in QUICK_REFERENCE.md
4. **Test**: Use test patterns from VISUALIZATION_DEVELOPMENT_GUIDE.md
5. **Deploy**: Follow deployment checklist in VISUALIZATION_DEVELOPMENT_GUIDE.md

## Key Integration Points

### Data Flow
```
Component → Redux Dispatch → Service → GraphQL/REST → Response → 
Redux Reducer → Component Re-render
```

### Real-time Flow
```
Server Event → Socket.emit → Client Socket.on → Redux Reducer → 
Component Re-render
```

### Multi-tenancy
```
User Auth → JWT with tenantId → All Queries filtered by tenantId → 
Isolated Data
```

## Common Questions Answered In Docs

- Where should I put new components? → QUICK_REFERENCE.md (Critical File Locations)
- How do I connect to Redux? → QUICK_REFERENCE.md (Common Code Snippets)
- How do I add real-time updates? → VISUALIZATION_DEVELOPMENT_GUIDE.md (Section 6)
- What visualization libraries are available? → VISUALIZATION_DEVELOPMENT_GUIDE.md (Library Selection Guide)
- How do I query the database? → QUICK_REFERENCE.md (Database Querying)
- What environment variables do I need? → QUICK_REFERENCE.md (Environment Variables)
- How do I troubleshoot issues? → QUICK_REFERENCE.md (Troubleshooting)
- How do I test my code? → VISUALIZATION_DEVELOPMENT_GUIDE.md (Testing Pattern)

## Getting Started

### If you're new to the project:
1. Start with ARCHITECTURE_SUMMARY.md introduction
2. Skim sections 1-3 (packages, frontend, backend)
3. Look at section 4 (existing visualizations)
4. Review VISUALIZATION_DEVELOPMENT_GUIDE.md patterns
5. Refer to QUICK_REFERENCE.md while coding

### If you're adding a feature:
1. Check VISUALIZATION_DEVELOPMENT_GUIDE.md sections 1-5 for structure
2. Use code templates as starting point
3. Follow patterns from QUICK_REFERENCE.md
4. Verify against deployment checklist

### If you're debugging:
1. Check QUICK_REFERENCE.md troubleshooting section
2. Look at monitoring endpoints in QUICK_REFERENCE.md
3. Review architectural patterns in ARCHITECTURE_SUMMARY.md

## Files Location on Disk

```
/home/user/summit/
├── ARCHITECTURE_SUMMARY.md          ← Comprehensive technical overview
├── VISUALIZATION_DEVELOPMENT_GUIDE.md ← Practical development guide
├── QUICK_REFERENCE.md                ← Quick lookup reference
└── DOCUMENTATION_INDEX.md            ← This file
```

## Additional Resources in Repo

- Code Examples: Existing components in `/client/src/components/`
- Type Definitions: `/packages/common-types/`
- Configuration: `.env`, `tsconfig.json`, `package.json`
- Tests: `/client/src/__tests__/`, `/server/__tests__/`
- GraphQL Schema: `/server/src/graphql/`

## Version Info

- Created: November 20, 2025
- Coverage: Full codebase exploration
- Tech Stack: React 18, Redux, Apollo, Express, GraphQL, Neo4j
- Scale: 150+ services, 60+ packages, 64+ components

## Support

For specific questions:
- Architecture questions → ARCHITECTURE_SUMMARY.md (most detailed)
- Development questions → VISUALIZATION_DEVELOPMENT_GUIDE.md (practical)
- Quick lookup → QUICK_REFERENCE.md (fast answers)

