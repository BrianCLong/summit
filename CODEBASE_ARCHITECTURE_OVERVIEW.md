# Summit Codebase Architecture Overview

**Date:** 2025-11-20  
**Branch:** claude/selector-minimization-alerts-01AYNLFYPfYF6anAX6eapcpq

---

## Executive Summary

The Summit platform is a sophisticated intelligence and investigative platform built on a TypeScript/Node.js monorepo with multiple interconnected services. The architecture combines:

- **GraphQL API** with Express.js backend for query execution
- **Multi-database architecture** (Neo4j graphs, PostgreSQL relational, Redis caching)
- **Advanced audit logging** system with compliance frameworks (SOC2, GDPR, ISO27001)
- **Policy enforcement** with purpose-based access control and attribute-based access control (ABAC)
- **Comprehensive reporting** system with multiple export formats
- **Real-time monitoring** and anomaly detection capabilities

---

## 1. Query Execution and Data Access

### 1.1 Entry Points

**GraphQL Server** (`/home/user/summit/server/src/index.ts`)
- WebSocket connections on `/graphql` endpoint
- Apollo Server with Express middleware integration
- Context-based authentication via `getContext()` from `lib/auth.js`

**Database Connections:**
- Neo4j: Graph database for entity relationships and network analysis
- PostgreSQL: Relational data storage
- Redis: Caching layer
- Mock mode fallback for development

### 1.2 Query Processing Pipeline

**GraphQL Resolvers** (`/home/user/summit/server/src/graphql/resolvers.ts`)

The resolver architecture implements a multi-stage query execution pipeline:

```
Request → GraphQL Parser → 
  Context Extraction (User, Purpose) →
  Policy Enforcement (ABAC) →
  Database Query Execution →
  Redaction Rules Application →
  Response Caching (Redis) →
  Response Return
```

**Key Resolver Files:**
- `/server/src/graphql/resolvers.ts` - Main resolver implementations
- `/server/src/graphql/resolvers/strategicIntelligenceResolvers.ts` - Strategic intelligence queries
- `/server/src/graphql/resolvers/multimodalResolvers.ts` - Multi-modal entity queries
- `/server/src/graphql/resolvers/crudResolvers.ts` - CRUD operation resolvers
- `/server/src/graphql/resolvers/graphragResolvers.ts` - GraphRAG integration

**Query Access Pattern Example** (from resolvers.ts):
```typescript
async tenantCoherence(_: any, { tenantId }: any, ctx: any) {
  // 1. Extract user context
  const user = getUser(ctx);
  
  // 2. Policy enforcement with purpose checking
  const policyDecision = await policyEnforcer.requirePurpose(
    'investigation',
    {
      tenantId,
      userId: user?.id,
      action: 'read',
      resource: 'coherence_score',
      purpose: ctx.purpose,
      clientIP: ctx.req?.ip,
      userAgent: ctx.req?.get('user-agent'),
    },
  );
  
  // 3. Cache check (Redis)
  const cachedResult = await redisClient.get(cacheKey);
  if (cachedResult) return JSON.parse(cachedResult);
  
  // 4. Database query execution
  const row = await pg.oneOrNone(
    'SELECT score, status FROM coherence_scores WHERE tenant_id=$1',
    [tenantId],
  );
  
  // 5. Apply redaction rules
  if (policyDecision.redactionRules?.length > 0) {
    return await redactionService.redactObject(result, redactionPolicy);
  }
  
  // 6. Cache result
  await redisClient.set(cacheKey, JSON.stringify(result), 'EX', 60);
  
  return result;
}
```

### 1.3 Database Access Patterns

**Neo4j Database** (`/server/src/db/neo4j.ts`)
- Driver singleton with mock mode fallback
- Health check every 15 seconds
- Automatic reconnection on failure
- Used for graph queries on entities and relationships
- Cypher query language

**PostgreSQL Database** (`/server/src/db/postgres.js`)
- Connection pooling
- Tenant-scoped data queries
- Region-aware queries for data residency

**Redis** (`/server/src/db/redis.js`)
- Cache prefix-based separation
- TTL support
- Pub/Sub for real-time events

### 1.4 Query Optimization

**Features:**
- Query result caching in Redis with configurable TTL
- Lazy loading of relationships
- Pagination support with skip/limit
- GraphQL persisted queries
- Neo4j query optimization (see `/server/src/optimization/neo4j-query-optimizer.ts`)

**Slow Query Detection** (`/services/api/src/middleware/slowQuery.ts`)
- Monitors query execution time
- Logs queries exceeding threshold
- Triggers performance alerts

---

## 2. Audit Logging and Monitoring

### 2.1 Advanced Audit System

**Core Implementation** (`/server/src/audit/advanced-audit-system.ts`)

The advanced audit system provides comprehensive audit trails with:

**Event Types:**
- System events (start, stop)
- Configuration changes
- User actions (login, logout, actions)
- Resource access/modify/delete
- Policy decisions and violations
- Approval requests and decisions
- Task execution
- Data operations (export, import)
- Security alerts
- Compliance violations
- Anomaly detection

**Audit Event Structure:**
```typescript
interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  timestamp: Date;
  correlationId: string;  // Traces related events
  sessionId?: string;
  requestId?: string;
  userId?: string;
  tenantId: string;
  serviceId: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  message: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  complianceRelevant: boolean;
  complianceFrameworks: ComplianceFramework[];
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  hash?: string;  // For integrity
  signature?: string;  // For authenticity
  previousEventHash?: string;  // For chain integrity
}
```

**Key Features:**
1. **Immutable Event Logging**
   - SHA-256 hashing of events
   - Event chaining (hash of previous event)
   - Cryptographic signing
   - Chain integrity verification

2. **Batch Processing**
   - Events buffered and flushed every 5 seconds
   - Critical events flushed immediately
   - Batch size: 100 events

3. **Compliance Tracking**
   - Framework-specific compliance logging
   - Evidence collection
   - Automatic compliance report generation

4. **Forensic Analysis**
   - Correlation ID tracing
   - Actor risk scoring
   - Resource access tracking
   - Anomaly detection

### 2.2 Middleware Audit Logging

**HTTP Middleware** (`/server/src/middleware/audit-logger.ts`)
```typescript
export function auditLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();
  res.on('finish', () => {
    const userId = (req as any).user?.id;
    writeAudit({
      userId,
      action: `${req.method} ${req.originalUrl}`,
      resourceType: 'http',
      details: { status: res.statusCode, durationMs: Date.now() - start },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  next();
}
```

**GraphQL Plugin Audit** (`/server/src/graphql/plugins/auditLogger.ts`)
- Logs all GraphQL queries and mutations
- Tracks operation names and variables
- Records execution time and errors

### 2.3 Monitoring and Observability

**Services:**
- `/server/src/services/monitoringObservabilityService.ts` - Centralized monitoring
- `/server/src/routes/monitoring.ts` - Monitoring endpoints
- `/server/src/optimization/performance-monitoring-system.ts` - Performance tracking

**Metrics Collection:**
- Prometheus metrics for GraphQL operations
- Neo4j query metrics (errors, latency, count)
- Policy decision metrics
- Database connection pool metrics

**Real-time Monitoring** (`/active-measures-module/src/monitoring/realTimeMonitor.ts`)
- Event-driven monitoring
- Real-time alert generation
- Performance anomaly detection

### 2.4 Retention and Compliance

**Data Retention Service** (`/server/src/services/DataRetentionService.ts`)
- Automated cleanup of audit logs
- Configurable retention periods (default: 7 years for SOC2/GDPR)
- Scheduled cleanup jobs
- Compliance-aware deletion

### 2.5 Audit Query Interface

**Query Capabilities:**
```typescript
async queryEvents(query: AuditQuery): Promise<AuditEvent[]>
```

Filtering options:
- Time range (startTime, endTime)
- Event types
- Severity levels
- User IDs
- Tenant IDs
- Resource types
- Correlation IDs
- Compliance frameworks

**Forensic Analysis:**
```typescript
async performForensicAnalysis(correlationId: string): Promise<ForensicAnalysis>
```

Returns:
- Timeline of events
- Actor analysis with risk scores
- Resource access patterns
- Anomalies detected

**Integrity Verification:**
```typescript
async verifyIntegrity(startDate?: Date, endDate?: Date): Promise<IntegrityStatus>
```

Validates:
- Event hash integrity
- Signature validity
- Chain continuity

---

## 3. Services, Repositories, and Database Access

### 3.1 Service Architecture

**Core Services** (`/server/src/services/`)

| Service | Purpose | Database | Key Files |
|---------|---------|----------|-----------|
| ComplianceService | Compliance automation & reporting | Redis cache | `ComplianceService.ts` |
| ReportingService | Report generation & distribution | Neo4j, PostgreSQL | `ReportingService.js` |
| monitoringObservabilityService | System monitoring | Prometheus | `monitoringObservabilityService.ts` |
| AnalystFeedbackService | Feedback collection | PostgreSQL | `AnalystFeedbackService.ts` |
| QueueService | Async task management | Redis | `QueueService.ts` |
| RTBFAuditService | Right-to-be-forgotten | PostgreSQL | `RTBFAuditService.ts` |
| DataRetentionService | Data retention policies | PostgreSQL | `DataRetentionService.ts` |
| ExtractionJobService | Data extraction | Neo4j | `ExtractionJobService.ts` |
| TenantSLOService | SLA management | Redis/PostgreSQL | `TenantSLOService.ts` |
| MVP1RBACService | Role-based access | PostgreSQL | `MVP1RBACService.ts` |
| DLPService | Data loss prevention | PostgreSQL | (DLP module) |

### 3.2 Repository Pattern

**Database Repositories** (`/server/src/db/repositories/`)
- `audit.ts` - Audit event storage and retrieval
- `doclingRepository.ts` - Document access
- `doclingGraphRepository.ts` - Document graph operations

**Repository Interface Pattern:**
```typescript
interface Repository<T> {
  create(item: T): Promise<T>;
  read(id: string): Promise<T | null>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  query(filter: QueryFilter): Promise<T[]>;
}
```

### 3.3 Policy Enforcement Architecture

**Policy Components** (`/server/src/policy/`)

1. **OPA Integration** (`policy/opa.ts`, `policy/opaClient.ts`)
   - Open Policy Agent for policy evaluation
   - Rego policy language support
   - Policy versioning

2. **Policy Enforcer** (`policy/enforcer.ts`)
   ```typescript
   export class PolicyEnforcer {
     async enforce(context: PolicyContext): Promise<PolicyDecision>
     async requirePurpose(
       purpose: Purpose,
       context: PolicyContext
     ): Promise<PolicyDecision>
   }
   ```

   **Enforcement Context:**
   - Tenant isolation
   - User identity
   - Action type (read, write, update, delete)
   - Purpose of access (investigation, benchmarking, monitoring, analytics)
   - Client IP and user agent
   - Timestamp

   **Policy Decision Output:**
   - Allow/deny determination
   - Redaction rules (fields to mask)
   - Audit requirements
   - Cache TTL

3. **Residency Enforcer** (`policy/residencyEnforcer.ts`)
   - Data residency compliance
   - Regional query routing
   - GDPR data localization

4. **RBAC Middleware** (`middleware/rbac.ts`)
   - Role-based access control
   - Conductor RBAC (`conductor/auth/rbac-middleware.ts`)

### 3.4 Data Access Control

**Redaction Service**
- PII masking
- Field-level encryption
- Policy-driven data obscuration

**Tenant Isolation**
- Multi-tenant database architecture
- Tenant scoping in all queries
- Separate connection pools per tenant

**Query Security:**
- SQL parameter binding
- GraphQL query whitelisting (persisted queries)
- Rate limiting
- Request validation

### 3.5 Async Processing

**Queue Service** (`services/QueueService.ts`)
- Task queuing and processing
- Scheduled job execution
- Retry logic with exponential backoff
- Dead-letter queue handling

**Workers:**
- Trust score worker (`workers/trustScoreWorker.ts`)
- Retention worker (`workers/retentionWorker.ts`)
- Kafka consumer for streaming data

---

## 4. Security and Compliance Features

### 4.1 Compliance Framework Integration

**Supported Frameworks** (via ComplianceService):

1. **GDPR (2018)**
   - Data Protection by Design (Article 25)
   - Records of Processing (Article 30)
   - Security of Processing (Article 32)
   - Automated checks for:
     - PII detection policies
     - Data encryption
     - Audit logging
     - Authentication enforcement

2. **SOC 2 Type II**
   - CC-6.1: Logical and Physical Access Controls
     - MFA validation
     - RBAC enforcement
   - CC-7.1: System Operations
     - Monitoring and alerting
     - Capacity planning

3. **ISO 27001:2022**
   - A.8.2: Information Classification
     - Automated data classification
   - A.12.6: Technical Vulnerability Management
     - Vulnerability scanning
     - Dependency checking

### 4.2 Automated Compliance Assessment

**ComplianceService** (`services/ComplianceService.ts`)

```typescript
async runAssessment(frameworkId: string): Promise<ComplianceReport>
```

**Assessment Process:**
1. Evaluates each requirement against controls
2. Detects compliance violations
3. Calculates compliance score (0-100)
4. Generates remediation recommendations
5. Caches reports in Redis

**Report Output:**
```typescript
interface ComplianceReport {
  id: string;
  frameworkId: string;
  generatedAt: Date;
  reportPeriod: { startDate: Date; endDate: Date };
  overallScore: number;
  status: 'compliant' | 'non-compliant' | 'pending';
  summary: {
    totalRequirements: number;
    compliantRequirements: number;
    nonCompliantRequirements: number;
    partialRequirements: number;
  };
  findings: ComplianceFinding[];
  recommendations: ComplianceRecommendation[];
  evidence: ComplianceEvidence[];
}
```

### 4.3 Security Headers and TLS

**Security Configuration** (`config/security.ts`, `config/production-security.ts`)
- Helmet.js for HTTP headers
- CORS validation
- TLS 1.3 enforcement
- AES-256 encryption for data at rest

**Routes:**
- `routes/compliance.ts` - Compliance controls export
- Health checks with security validation

### 4.4 Policy-Driven Security

**Purpose-Based Access Control**
- Access requests require a declared purpose
- Policy enforcer validates purpose alignment
- Purpose violations logged as security events

**Attribute-Based Access Control (ABAC)**
- User attributes (roles, departments)
- Resource attributes (classification, location)
- Environmental attributes (time, IP)
- Context attributes (purpose, action)

**Redaction Rules**
- Applied dynamically based on policy decision
- PII masking for unauthorized users
- Sensitive field obscuration
- Field-level encryption

### 4.5 Threat Detection

**Anomaly Detection** (`server/src/anomaly.ts`)

Statistical methods:
- EWMA (Exponential Weighted Moving Average) for trend detection
- Robust Z-score calculation using Median Absolute Deviation (MAD)
- Threshold: Z >= 4 for anomaly detection

**Forensic Anomaly Detection** (in AdvancedAuditSystem)
- Burst activity detection (30%+ faster than average)
- Repeated failures detection (50%+ failure rate)
- After-hours activity analysis
- High-sensitivity resource access tracking

### 4.6 Data Protection

**DLP Service**
- Policy-driven data classification
- Automatic PII detection
- Export controls
- Data breach notification

**Data Retention**
- Automated cleanup based on classification
- WORM (Write-Once-Read-Many) support
- Immutable audit trails
- Compliance-aware deletion

---

## 5. Report Generation and Storage

### 5.1 Reporting Service Architecture

**ReportingService** (`server/src/services/ReportingService.js`)

**Report Templates:**
- INVESTIGATION_SUMMARY
- ENTITY_PROFILE / ENTITY_ANALYSIS
- NETWORK_ANALYSIS
- COMPLIANCE_AUDIT
- SECURITY_ASSESSMENT
- ANALYTICS_REPORT
- ANALYTICS_DASHBOARD
- TEMPORAL_ANALYSIS

### 5.2 Report Generation Pipeline

**Workflow:**
```
1. Report Request →
2. Template Selection →
3. Parameter Validation →
4. Data Collection:
   - Neo4j queries for relationships
   - PostgreSQL for audit data
   - Cache for performance data
5. Section Generation:
   - Executive Summary
   - Timeline Analysis
   - Key Entities
   - Risk Assessment
   - Compliance Findings
   - Recommendations
6. Output Format Generation:
   - PDF (via Puppeteer)
   - HTML
   - JSON
   - CSV
   - Excel
   - PowerPoint
   - Gephi Graph Format
7. Storage
8. Distribution
```

### 5.3 Supported Export Formats

| Format | MIME Type | Library | Supports |
|--------|-----------|---------|----------|
| PDF | application/pdf | Puppeteer | Text, images, charts, tables |
| DOCX | Office XML | - | Text, images, tables, styling |
| HTML | text/html | Built-in | Interactive elements, styling |
| JSON | application/json | Built-in | Structured data export |
| CSV | text/csv | Built-in | Tabular data |
| Excel | Office XML | ExcelJS | Multiple sheets, formatting, charts |
| PPT | Office XML | PptxGenJS | Slides, images, charts |
| Gephi | application/gexf+xml | Built-in | Graph data, network visualization |

### 5.4 Report Sections

**Investigation Summary:**
- Investigation overview
- Entity and relationship counts
- Timeline data
- Key insights
- Risk level assessment
- Completion status

**Entity Profile:**
- Basic information
- Connection analysis
- Activity timeline
- Risk assessment
- Media evidence
- Related investigations

**Network Analysis:**
- Network topology
- Centrality analysis
- Community detection
- Key players
- Influence patterns
- Communication flows
- Anomaly detection

**Compliance Audit:**
- Audit scope
- Compliance overview
- Security findings
- Access patterns
- Violations summary
- Risk assessment
- Remediation plan

### 5.5 Report Status and Tracking

**Report States:**
- QUEUED: Awaiting processing
- GENERATING: Currently being generated
- PROCESSING: Processing data
- COMPLETED: Ready for download
- FAILED: Error during generation

**Tracking:**
```typescript
interface ReportStatus {
  id: string;
  templateId: string;
  status: ReportState;
  createdAt: Date;
  progress: number (0-100);
  estimatedCompletion: Date;
  startTime: number;
  endTime?: number;
  executionTime?: number;
  outputPath?: string;
  outputSize?: number;
  outputMimeType?: string;
}
```

**Metrics:**
- totalReports
- completedReports
- failedReports
- totalExports
- averageGenerationTime
- successRate

### 5.6 Scheduled Reports

**Scheduling Features:**
- Cron expression support
- Recurring report generation
- Automatic email distribution
- Schedule management

**Implementation:**
```typescript
async scheduleReport(scheduleData): Promise<Schedule>
async processScheduledReports(): Promise<void>
async runScheduledReport(schedule): Promise<Report>
```

**Execution:**
- Checks every hour for due reports
- Generates report asynchronously
- Sends to configured recipients
- Records execution in audit log

### 5.7 Dashboards

**Dashboard Types:**
1. **EXECUTIVE_OVERVIEW**
   - Active investigations metric
   - High priority alerts
   - Investigation trends
   - Entity distribution
   - Recent activities
   - Geographic distribution

2. **ANALYST_WORKSPACE**
   - My investigations
   - Pending tasks
   - Daily activity
   - Recent entities
   - Connection types
   - Investigation timeline

3. **SECURITY_MONITORING**
   - Active sessions
   - Failed logins
   - Login patterns
   - Security alerts
   - Access heatmap
   - System health

**Refresh Intervals:**
- Executive: 5 minutes
- Analyst: 1 minute
- Security: 30 seconds

### 5.8 Report Storage

**Location:** `/tmp/report_*.{pdf,docx,html,json,csv,xlsx,pptx,gexf}`

**Lifecycle:**
1. Generated in temporary directory
2. Associated with report ID
3. Available for download via signed URL
4. Cleaned up via retention policies

**Security:**
- Signed download URLs with time-limited tokens
- User ID validation
- Audit trail of downloads

### 5.9 Report Customization

**Custom Templates:**
```typescript
async createCustomTemplate(templateData): Promise<Template>
```

**Template Extension:**
```typescript
async extendTemplate(baseTemplateId, customization): Promise<Template>
```

---

## Implementation Recommendations for Selector Minimization

### Key Integration Points

1. **Query Minimization Logging**
   - Hook into GraphQL resolver pre-execution
   - Calculate query cost before execution
   - Log selector expansion with audit event
   - Track cumulative query expansion per request

2. **Anomaly Detection Integration**
   - Add selector expansion anomalies to audit events
   - Feed into forensic analysis
   - Correlate with policy violations

3. **Access Prompt Integration**
   - Integrate with policy enforcer
   - Require explicit approval for high-expansion queries
   - Track approval workflow in audit

4. **Compliance Reporting**
   - Add query expansion metrics to compliance audit reports
   - Include selector minimization violations in findings
   - Generate remediation recommendations

5. **Real-time Alerts**
   - Use Redis pub/sub for anomaly events
   - Generate alerts for threshold breaches
   - Integrate with security monitoring dashboard

---

## Database Connection Details

### Neo4j
- **URL:** `process.env.NEO4J_URI` (default: `bolt://neo4j:7687`)
- **Auth:** Basic auth with username/password
- **Health Check:** Every 15 seconds
- **Mock Mode:** Enabled for development

### PostgreSQL
- **Connection Pool:** Configurable size
- **Audit Tables:** `audit_events`, `compliance_reports`, `forensic_analyses`
- **Tenant Scoping:** All queries filtered by `tenant_id`

### Redis
- **URL:** `process.env.REDIS_URL`
- **Use Cases:** Caching, pub/sub, session storage
- **TTL:** Configurable per operation

---

## File Structure Summary

```
server/src/
├── audit/
│   ├── advanced-audit-system.ts       # Immutable audit logging
│   ├── auditMiddleware.ts             # Middleware integration
│   ├── AuditLogger.ts                 # Audit interface
│   └── auditDashboard.ts              # UI dashboards
├── graphql/
│   ├── resolvers/
│   │   ├── crudResolvers.ts
│   │   ├── multimodalResolvers.ts
│   │   ├── strategicIntelligenceResolvers.ts
│   │   └── graphragResolvers.ts
│   ├── plugins/
│   │   └── auditLogger.ts
│   └── schema.ts
├── policy/
│   ├── enforcer.ts                    # Policy enforcement
│   ├── opa.ts                         # OPA integration
│   ├── opaClient.ts
│   └── residencyEnforcer.ts
├── services/
│   ├── ComplianceService.ts           # Compliance automation
│   ├── ReportingService.js            # Report generation
│   ├── monitoringObservabilityService.ts
│   ├── DataRetentionService.ts
│   └── [other services]
├── middleware/
│   ├── audit-logger.ts
│   ├── rbac.ts
│   ├── security.ts
│   └── withAuthAndPolicy.ts
├── db/
│   ├── neo4j.ts
│   ├── postgres.js
│   ├── redis.js
│   └── repositories/
│       ├── audit.ts
│       └── [other repos]
├── routes/
│   ├── compliance.ts
│   ├── monitoring.ts
│   ├── audit.ts
│   └── [other routes]
└── anomaly.ts                         # Anomaly detection
```

---

## Key Metrics and Monitoring Points

### Policy Enforcement Metrics
- `policy_decisions_total` - Total OPA decisions
- `policy_decision_latency_ms` - Decision latency
- `purpose_violations_total` - Purpose limitation violations

### Query Metrics
- GraphQL operation duration
- Cache hit/miss rates
- Database query latency
- Resolver execution time

### Audit Metrics
- Events per second
- Flush success/failure rates
- Integrity verification status
- Forensic analysis job counts

### Compliance Metrics
- Framework assessment status
- Compliance scores
- Violation counts
- Remediation progress

---

## Security Best Practices Implemented

1. **Immutable Audit Trails**
   - Cryptographic signing
   - Chain integrity verification
   - 7-year retention default

2. **Policy Enforcement**
   - OPA-based policy evaluation
   - Purpose-based access control
   - ABAC support

3. **Data Protection**
   - Field-level redaction
   - Encryption at rest and in transit
   - Data loss prevention

4. **Compliance**
   - Automated assessment
   - Evidence collection
   - Remediation tracking

5. **Monitoring**
   - Real-time alerts
   - Anomaly detection
   - Performance tracking

