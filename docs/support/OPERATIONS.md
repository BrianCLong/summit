# Enterprise Support Operations Guide

## Overview

The Summit Enterprise Support Platform provides comprehensive infrastructure for world-class customer support, including help desk, knowledge base, training, SLA management, and 24/7 operations.

## Architecture

### Core Components

1. **Support System Package** (`@summit/support-system`)
   - Multi-channel ticket management
   - SLA tracking and enforcement
   - Escalation workflows
   - Assignment and routing

2. **Knowledge Base Package** (`@summit/knowledge-base`)
   - Self-service documentation
   - Article versioning
   - Full-text search
   - Analytics and feedback

3. **Training Platform** (`@summit/training-platform`)
   - Online courses and modules
   - Interactive labs
   - Certification exams
   - Progress tracking

4. **SLA Management** (`@summit/sla-management`)
   - Multi-tier SLA definitions
   - Compliance monitoring
   - Breach detection and alerting
   - Credit calculations

5. **Health Monitoring** (`@summit/health-monitoring`)
   - Service component tracking
   - Incident management
   - Status page
   - Uptime recording

### Services

- **Help Desk Service** (`services/help-desk/`) - REST API exposing all support functionality
- **Customer Portal** (`frontend/customer-portal/`) - Customer-facing support interface

## Database Schema

The enterprise support schema is defined in `migrations/postgres/015_enterprise_support_schema.sql` and includes:

### Ticket Management

- `support_tickets` - Multi-channel support tickets with SLA tracking
- `ticket_comments` - Ticket conversation history
- `ticket_attachments` - File attachments
- `ticket_history` - Audit trail of changes
- `ticket_templates` - Reusable ticket templates
- `escalation_rules` - Automated escalation policies

### Knowledge Base

- `kb_articles` - Documentation articles with versioning
- `kb_article_versions` - Article change history
- `kb_faqs` - Frequently asked questions
- `kb_tutorials` - Video and interactive tutorials

### Training

- `training_courses` - Course catalog
- `training_modules` - Course content modules
- `training_labs` - Hands-on lab environments
- `user_training_progress` - User enrollment and progress
- `certification_exams` - Assessment content
- `certification_attempts` - Exam attempts
- `certifications` - Issued certificates

### Health Monitoring

- `service_components` - Monitored services
- `service_health_checks` - Health check results
- `system_incidents` - Incident tracking
- `incident_updates` - Incident communication
- `status_page_subscriptions` - Status notification subscribers

### SLA Management

- `sla_definitions` - SLA tier definitions
- `sla_breaches` - Tracked SLA violations
- `uptime_records` - Daily uptime metrics

### Customer Success

- `customer_accounts` - Account management
- `customer_health_metrics` - Account health tracking
- `success_plans` - Customer success initiatives
- `business_reviews` - QBR tracking

### Professional Services

- `service_offerings` - Professional services catalog
- `service_engagements` - Project tracking
- `service_time_entries` - Time and billing

### Operations

- `on_call_schedules` - On-call rotation
- `on_call_shifts` - Shift assignments
- `runbooks` - Operational procedures
- `post_mortems` - Incident retrospectives

## Help Desk Operations

### Creating Tickets

Tickets can be created through multiple channels:

```typescript
import { TicketService } from '@summit/support-system';

const ticket = await ticketService.createTicket({
  tenantId: 'tenant-uuid',
  customerEmail: 'customer@example.com',
  subject: 'Unable to access dashboard',
  description: 'Getting 403 error when accessing /dashboard',
  priority: 'HIGH',
  severity: 'SEV2',
  channel: 'EMAIL',
  category: 'Technical Issue',
  slaTier: 'ENTERPRISE'
});
```

### Ticket Lifecycle

1. **NEW** - Ticket created, awaiting assignment
2. **OPEN** - Ticket assigned, work not started
3. **IN_PROGRESS** - Actively being worked
4. **PENDING_CUSTOMER** - Waiting for customer response
5. **PENDING_INTERNAL** - Waiting for internal team
6. **RESOLVED** - Solution provided
7. **CLOSED** - Ticket closed after confirmation
8. **CANCELLED** - Ticket cancelled

### SLA Tracking

SLAs are automatically calculated based on severity and tier:

```typescript
// SLA targets are set per severity level
SEV1 (Critical): 15 min response, 4 hour resolution
SEV2 (Major): 1 hour response, 24 hour resolution
SEV3 (Minor): 4 hour response, 7 day resolution
SEV4 (Cosmetic): 24 hour response, 30 day resolution
```

### Escalation Rules

Escalations trigger automatically based on:
- No response within threshold
- No resolution within threshold
- SLA breach at X% threshold
- Priority/severity combinations

## Knowledge Base Management

### Article Creation

```typescript
import { KnowledgeBaseService } from '@summit/knowledge-base';

const article = await kbService.createArticle({
  tenantId: 'tenant-uuid',
  title: 'How to Reset Your Password',
  content: '# Password Reset\n\n...',
  category: 'Account Management',
  tags: ['password', 'security', 'authentication'],
  isPublic: true,
  authorId: 'user-uuid'
});
```

### Article Versioning

All content changes are versioned automatically. Previous versions can be retrieved:

```typescript
const versions = await kbService.getArticleVersions(articleId);
```

### Search and Discovery

Full-text search is enabled on articles:

```typescript
const articles = await kbService.searchArticles({
  query: 'password reset',
  category: 'Account Management',
  isPublic: true,
  limit: 10
});
```

## Training Platform

### Course Management

```typescript
import { TrainingService } from '@summit/training-platform';

const course = await trainingService.createCourse(
  'tenant-uuid',
  'Summit Platform Fundamentals',
  'Learn the basics of Summit',
  'beginner',
  2.0 // estimated hours
);
```

### User Enrollment

```typescript
const progress = await trainingService.enrollUser(userId, courseId);
```

### Certification

```typescript
const cert = await trainingService.issueCertification(
  userId,
  courseId,
  12 // expires in 12 months
);
```

## SLA Management

### Monitoring Compliance

```typescript
import { SLAManagementService } from '@summit/sla-management';

const metrics = await slaService.calculateSLAMetrics(
  tenantId,
  startDate,
  endDate
);

console.log(`SLA Compliance: ${metrics.responseCompliance}%`);
console.log(`Total Breaches: ${metrics.totalBreaches}`);
```

### Breach Handling

```typescript
const breaches = await slaService.getSLABreaches(tenantId, startDate, endDate);

for (const breach of breaches) {
  await slaService.acknowledgeBreach(
    breach.id,
    userId,
    'Outage caused by infrastructure issue'
  );

  await slaService.applyCredit(breach.id, 100.00);
}
```

## Health Monitoring

### Component Registration

```typescript
import { HealthMonitoringService } from '@summit/health-monitoring';

await healthService.registerComponent(
  'api-gateway',
  'API Gateway',
  true, // is critical
  'https://api.summit.com/health',
  60 // check every 60 seconds
);
```

### Incident Management

```typescript
const incident = await healthService.createIncident(
  'API Gateway Degraded Performance',
  'P1', // severity
  ['api-gateway-uuid'],
  'Response times increased by 300%'
);

await healthService.addIncidentUpdate(
  incident.id,
  'INVESTIGATING',
  'Team investigating database connection pool exhaustion'
);

await healthService.resolveIncident(
  incident.id,
  'Increased connection pool size from 20 to 50',
  'Database connection pool was undersized for current load'
);
```

### Status Page

The system status is publicly available:

```typescript
const health = await healthService.getSystemHealth();
// Returns: { status: 'HEALTHY', components: [...] }
```

## 24/7 Operations

### On-Call Management

On-call schedules and shifts are managed in the database:

```sql
-- Create schedule
INSERT INTO on_call_schedules (tenant_id, name, team, timezone)
VALUES ('tenant-uuid', 'Platform Engineering', 'engineering', 'America/Los_Angeles');

-- Create shift
INSERT INTO on_call_shifts (schedule_id, user_id, start_time, end_time, is_primary)
VALUES ('schedule-uuid', 'user-uuid', '2025-01-20 00:00:00', '2025-01-27 00:00:00', true);
```

### Runbooks

Operational procedures are stored as runbooks:

```sql
INSERT INTO runbooks (tenant_id, title, category, steps)
VALUES (
  'tenant-uuid',
  'API Gateway Restart Procedure',
  'infrastructure',
  '[
    {"title": "Check current status", "description": "Verify gateway health"},
    {"title": "Drain connections", "description": "Run: kubectl drain ..."},
    {"title": "Restart pods", "description": "Run: kubectl rollout restart ..."}
  ]'::jsonb
);
```

### Post-Mortems

After incidents, conduct post-mortems:

```sql
INSERT INTO post_mortems (incident_id, title, date, summary, root_cause, action_items)
VALUES (
  'incident-uuid',
  'API Gateway Outage - Jan 15, 2025',
  '2025-01-15',
  'Complete API gateway outage lasting 47 minutes',
  'Kubernetes node failure caused pod eviction without successful rescheduling',
  '[
    {"description": "Implement pod disruption budgets", "owner": "john@example.com", "due_date": "2025-02-01"},
    {"description": "Add multi-zone redundancy", "owner": "jane@example.com", "due_date": "2025-02-15"}
  ]'::jsonb
);
```

## Customer Success

### Account Health Tracking

```sql
-- Track daily health metrics
INSERT INTO customer_health_metrics (
  account_id, metric_date, active_users, total_licensed_users,
  feature_adoption_rate, support_tickets_count, health_score
)
VALUES (
  'account-uuid', CURRENT_DATE, 47, 50, 0.82, 2, 85
);
```

### Success Plans

```sql
INSERT INTO success_plans (account_id, title, objectives, start_date, target_date)
VALUES (
  'account-uuid',
  'Q1 2025 Success Plan',
  ARRAY['Increase adoption to 90%', 'Complete advanced training'],
  '2025-01-01',
  '2025-03-31'
);
```

## API Reference

### REST API Endpoints

The help desk service exposes these endpoints:

#### Tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/:id` - Get ticket
- `PATCH /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/comments` - Add comment
- `GET /api/tickets` - Search tickets

#### Knowledge Base
- `POST /api/kb/articles` - Create article
- `GET /api/kb/articles/:id` - Get article
- `GET /api/kb/articles/slug/:slug` - Get by slug
- `GET /api/kb/articles` - Search articles
- `POST /api/kb/articles/:id/feedback` - Record feedback
- `GET /api/kb/faqs` - Get FAQs

#### Training
- `GET /api/training/courses` - List courses
- `POST /api/training/enroll` - Enroll in course
- `GET /api/training/progress` - Get user progress
- `GET /api/training/certifications` - Get certifications

#### SLA
- `GET /api/sla/metrics` - Get SLA metrics
- `GET /api/sla/breaches` - Get SLA breaches

#### Health
- `GET /api/health/status` - System health
- `GET /api/health/incidents` - Active incidents
- `GET /api/health/incidents/history` - Incident history
- `POST /api/health/subscribe` - Subscribe to updates

## Monitoring and Observability

### Metrics

The support platform exposes Prometheus metrics:

- `support_tickets_total` - Total tickets created
- `support_tickets_by_status` - Tickets by status
- `support_response_time_seconds` - Response time histogram
- `support_resolution_time_seconds` - Resolution time histogram
- `support_sla_compliance_ratio` - SLA compliance rate
- `support_satisfaction_score` - Customer satisfaction

### Logging

All services use structured logging with pino:

```typescript
logger.info({ ticketId, action: 'created' }, 'Ticket created');
logger.warn({ ticketId, breachType, minutes }, 'SLA breach detected');
logger.error({ error, ticketId }, 'Failed to update ticket');
```

## Deployment

### Environment Variables

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=summit
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret

# Application
PORT=3100
LOG_LEVEL=info
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=https://portal.summit.com,https://app.summit.com
```

### Running Services

```bash
# Help desk service
cd services/help-desk
pnpm install
pnpm build
pnpm start

# Customer portal
cd frontend/customer-portal
pnpm install
pnpm build
pnpm preview
```

### Database Migrations

```bash
psql -U postgres -d summit -f migrations/postgres/015_enterprise_support_schema.sql
```

## Best Practices

### Ticket Management

1. **Use Templates** - Create templates for common issues
2. **Tag Appropriately** - Use consistent tagging for categorization
3. **SLA Awareness** - Monitor SLA compliance proactively
4. **Customer Communication** - Keep customers updated regularly
5. **Knowledge Base Integration** - Link tickets to KB articles

### Knowledge Base

1. **Keep Current** - Review and update articles quarterly
2. **Use Analytics** - Track article effectiveness
3. **Encourage Feedback** - Use helpful/not helpful ratings
4. **Version Control** - Document why changes were made
5. **Public vs Internal** - Separate customer-facing and internal docs

### Training

1. **Progressive Paths** - Structure learning from basic to advanced
2. **Hands-on Labs** - Include practical exercises
3. **Regular Updates** - Keep content current with product changes
4. **Track Completion** - Monitor progress and engagement
5. **Certifications** - Offer certifications for validation

### SLA Management

1. **Define Clearly** - Document SLA commitments clearly
2. **Monitor Continuously** - Track compliance in real-time
3. **Escalate Early** - Don't wait for breaches
4. **Document Exceptions** - Record justifications for breaches
5. **Review Regularly** - Assess and adjust SLA targets quarterly

### Incident Management

1. **Communicate Early** - Update status page immediately
2. **Follow Process** - Use runbooks for consistency
3. **Document Everything** - Record timeline and actions
4. **Post-Mortem Always** - Learn from every incident
5. **Implement Action Items** - Track post-mortem improvements

## Support Tiers

### Basic
- Business hours support (9am-5pm local time)
- 24-hour response time
- 7-day resolution target
- Email and portal support

### Professional
- Extended hours support (7am-7pm)
- 4-hour response time
- 48-hour resolution target
- Email, portal, and chat support

### Enterprise
- 24/7 support
- 1-hour response time for P1/P2
- 24-hour resolution target for P1/P2
- All channels including phone
- Dedicated CSM

### Premium
- 24/7 priority support
- 15-minute response for P0/P1
- 4-hour resolution for P0/P1
- Direct engineering escalation
- Dedicated TAM

## Conclusion

The Summit Enterprise Support Platform provides world-class support infrastructure with comprehensive ticketing, knowledge base, training, SLA management, and 24/7 operations capabilities. This platform ensures production stability, rapid issue resolution, and customer satisfaction at scale.

For questions or support, contact the platform team or refer to the API documentation.
