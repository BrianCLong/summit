# SLA Management Guide

## Overview

This guide covers Service Level Agreement (SLA) management in the Summit Enterprise Support Platform, including definitions, monitoring, compliance tracking, breach handling, and credit calculations.

## SLA Definitions

### Support Tiers

Summit offers four support tiers, each with distinct SLA commitments:

#### Basic Tier
- **Support Hours**: Business hours (9am-5pm local time, Mon-Fri)
- **Channels**: Email, Portal
- **Response Targets**:
  - SEV1: 24 hours
  - SEV2: 24 hours
  - SEV3: 48 hours
  - SEV4: 72 hours
- **Resolution Targets**:
  - SEV1: 7 days
  - SEV2: 14 days
  - SEV3: 30 days
  - SEV4: 60 days
- **Uptime**: 99.0%

#### Professional Tier
- **Support Hours**: Extended hours (7am-7pm local time, Mon-Fri)
- **Channels**: Email, Portal, Chat
- **Response Targets**:
  - SEV1: 4 hours
  - SEV2: 8 hours
  - SEV3: 24 hours
  - SEV4: 48 hours
- **Resolution Targets**:
  - SEV1: 48 hours
  - SEV2: 5 days
  - SEV3: 14 days
  - SEV4: 30 days
- **Uptime**: 99.5%

#### Enterprise Tier
- **Support Hours**: 24/7/365
- **Channels**: Email, Portal, Chat, Phone
- **Response Targets**:
  - SEV1: 1 hour
  - SEV2: 2 hours
  - SEV3: 4 hours
  - SEV4: 24 hours
- **Resolution Targets**:
  - SEV1: 24 hours
  - SEV2: 48 hours
  - SEV3: 7 days
  - SEV4: 30 days
- **Uptime**: 99.9%
- **Features**: Dedicated CSM, quarterly business reviews

#### Premium Tier
- **Support Hours**: 24/7/365 priority
- **Channels**: All channels + direct engineering escalation
- **Response Targets**:
  - SEV1: 15 minutes
  - SEV2: 30 minutes
  - SEV3: 2 hours
  - SEV4: 8 hours
- **Resolution Targets**:
  - SEV1: 4 hours
  - SEV2: 24 hours
  - SEV3: 3 days
  - SEV4: 14 days
- **Uptime**: 99.99%
- **Features**: Dedicated TAM, monthly reviews, on-site support

### Severity Levels

#### SEV1 - Critical
- **Impact**: Complete business stoppage
- **Examples**:
  - Total system outage
  - Data loss or corruption
  - Security breach
  - Core functionality completely unavailable
- **Escalation**: Immediate to senior engineering

#### SEV2 - Major
- **Impact**: Major functionality impaired
- **Examples**:
  - Critical feature unavailable
  - Significant performance degradation
  - Multiple users affected
  - Workaround available but difficult
- **Escalation**: To engineering within SLA window

#### SEV3 - Minor
- **Impact**: Minor functionality affected
- **Examples**:
  - Non-critical feature issue
  - Single user affected
  - Easy workaround available
  - Cosmetic issues affecting usability
- **Escalation**: Standard support process

#### SEV4 - Enhancement
- **Impact**: No business impact
- **Examples**:
  - Feature requests
  - Documentation updates
  - Cosmetic improvements
  - General questions
- **Escalation**: Product management review

## SLA Configuration

### Creating SLA Definitions

```sql
INSERT INTO sla_definitions (
  tenant_id,
  name,
  tier,
  sev1_response_minutes,
  sev2_response_minutes,
  sev3_response_minutes,
  sev4_response_minutes,
  sev1_resolution_minutes,
  sev2_resolution_minutes,
  sev3_resolution_minutes,
  sev4_resolution_minutes,
  uptime_percentage,
  support_hours,
  business_hours_start,
  business_hours_end,
  business_days,
  credit_percentage_per_breach,
  max_credit_percentage
) VALUES (
  'tenant-uuid',
  'Enterprise Support SLA',
  'ENTERPRISE',
  60,    -- SEV1: 1 hour
  120,   -- SEV2: 2 hours
  240,   -- SEV3: 4 hours
  1440,  -- SEV4: 24 hours
  1440,  -- SEV1: 24 hours
  2880,  -- SEV2: 48 hours
  10080, -- SEV3: 7 days
  43200, -- SEV4: 30 days
  99.9,
  '24x7',
  NULL,
  NULL,
  NULL,
  5.0,   -- 5% credit per breach
  25.0   -- Max 25% total credits
);
```

### Business Hours Configuration

For tiers with business hours support:

```sql
UPDATE sla_definitions
SET
  support_hours = 'business_hours',
  business_hours_start = '09:00:00',
  business_hours_end = '17:00:00',
  business_days = ARRAY[1, 2, 3, 4, 5] -- Monday through Friday
WHERE tier = 'BASIC';
```

## SLA Monitoring

### Automatic Tracking

The system automatically tracks:

1. **Response Time**: Time from ticket creation to first response
2. **Resolution Time**: Time from ticket creation to resolution
3. **SLA Due Dates**: Calculated based on severity and tier
4. **Breach Detection**: Real-time monitoring of SLA violations

### Monitoring Implementation

```typescript
import { SLAManagementService } from '@summit/sla-management';

// Schedule monitoring for a ticket
await slaService.scheduleSLAMonitoring(
  ticketId,
  responseDueAt,
  resolutionDueAt
);

// Check current SLA status
await slaService.monitorTicketSLA(ticketId);
```

### Real-Time Alerts

Configure alerts for impending breaches:

```typescript
// Alert when 75% of SLA time elapsed
const threshold = 0.75;

// System checks periodically and sends alerts
if (percentTimeElapsed >= threshold && !resolved) {
  await escalationQueue.add('sla-warning', {
    ticketId,
    percentElapsed: percentTimeElapsed,
    timeRemaining: slaTarget - elapsed
  });
}
```

## Compliance Tracking

### Daily Metrics

```typescript
const metrics = await slaService.calculateSLAMetrics(
  tenantId,
  startDate,
  endDate
);

console.log(`
  Total Tickets: ${metrics.totalTickets}
  Response Compliance: ${metrics.responseCompliance}%
  Resolution Compliance: ${metrics.resolutionCompliance}%
  Total Breaches: ${metrics.totalBreaches}
  Average Response Time: ${metrics.averageResponseTimeMinutes} min
  Average Resolution Time: ${metrics.averageResolutionTimeMinutes} min
`);
```

### Compliance Reports

Generate monthly compliance reports:

```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  sla_tier,
  COUNT(*) as total_tickets,
  COUNT(*) FILTER (
    WHERE first_response_at <= response_due_at
  ) as response_compliant,
  COUNT(*) FILTER (
    WHERE resolved_at <= resolution_due_at
  ) as resolution_compliant,
  AVG(
    EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60
  ) as avg_response_minutes,
  AVG(
    EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
  ) as avg_resolution_minutes
FROM support_tickets
WHERE tenant_id = 'tenant-uuid'
  AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
GROUP BY DATE_TRUNC('month', created_at), sla_tier
ORDER BY month DESC, sla_tier;
```

## Breach Management

### Breach Detection

Breaches are automatically detected when:
- First response occurs after `response_due_at`
- Resolution occurs after `resolution_due_at`

```typescript
// Breach is automatically recorded
await this.recordBreach(
  ticketId,
  'response', // or 'resolution'
  targetTime,
  slaTier
);
```

### Breach Acknowledgment

Support managers should acknowledge breaches:

```typescript
await slaService.acknowledgeBreach(
  breachId,
  managerId,
  'Network outage caused 2-hour delay in response'
);
```

### Viewing Breaches

```typescript
const breaches = await slaService.getSLABreaches(
  tenantId,
  startDate,
  endDate
);

for (const breach of breaches) {
  console.log(`
    Ticket: ${breach.ticket_number}
    Type: ${breach.breach_type}
    Target: ${breach.target_time}
    Breach: ${breach.breach_minutes} minutes late
    Status: ${breach.is_acknowledged ? 'Acknowledged' : 'Pending'}
  `);
}
```

## Credit Calculations

### Automatic Credits

Credits are calculated based on SLA definition:

```typescript
const creditPerBreach = 5.0; // 5% per breach
const maxCredit = 25.0; // Max 25% of monthly fees

// Applied automatically or manually
await slaService.applyCredit(breachId, creditAmount);
```

### Credit Policy

1. **Response Breaches**: Credit based on delay
   - < 2x target: 5% credit
   - 2-4x target: 10% credit
   - > 4x target: 15% credit

2. **Resolution Breaches**: Credit based on severity
   - SEV1: 20% credit
   - SEV2: 15% credit
   - SEV3: 10% credit
   - SEV4: 5% credit

3. **Uptime Breaches**: Monthly credit based on downtime
   - 99.9-99.0%: 10% credit
   - 99.0-98.0%: 25% credit
   - < 98.0%: 50% credit

### Credit Application

```sql
-- Calculate total credits for a customer
SELECT
  c.customer_name,
  COUNT(sb.id) as total_breaches,
  SUM(sb.credit_amount) as total_credits,
  c.monthly_fees,
  LEAST(
    SUM(sb.credit_amount) / c.monthly_fees * 100,
    sd.max_credit_percentage
  ) as credit_percentage
FROM sla_breaches sb
JOIN support_tickets st ON sb.ticket_id = st.id
JOIN customers c ON st.customer_id = c.id
JOIN sla_definitions sd ON sb.sla_definition_id = sd.id
WHERE sb.created_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND sb.credit_applied = true
GROUP BY c.customer_name, c.monthly_fees, sd.max_credit_percentage;
```

## Uptime Monitoring

### Recording Uptime

```typescript
await slaService.recordDailyUptime(
  componentId,
  date,
  uptimePercentage,
  downtimeMinutes
);
```

### Calculating Monthly Uptime

```typescript
const uptime = await slaService.calculateUptime(
  componentId,
  monthStart,
  monthEnd
);

if (uptime < slaTarget) {
  // Calculate credit based on shortfall
  const creditPercentage = calculateUptimeCredit(uptime, slaTarget);
  await applyUptimeCredit(customerId, creditPercentage);
}
```

### Uptime Reporting

```sql
SELECT
  sc.name as component,
  DATE_TRUNC('month', ur.date) as month,
  AVG(ur.uptime_percentage) as avg_uptime,
  SUM(ur.downtime_minutes) as total_downtime,
  COUNT(*) FILTER (WHERE ur.uptime_percentage < 99.9) as breach_days
FROM uptime_records ur
JOIN service_components sc ON ur.component_id = sc.id
WHERE sc.is_critical = true
  AND ur.date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY sc.name, DATE_TRUNC('month', ur.date)
ORDER BY month DESC, component;
```

## Escalation Procedures

### Automatic Escalation

Define escalation rules:

```sql
INSERT INTO escalation_rules (
  tenant_id,
  name,
  priority,
  severity,
  sla_tier,
  no_response_minutes,
  no_resolution_minutes,
  sla_breach_threshold,
  escalate_to,
  escalate_to_team,
  notify_users,
  increase_priority
) VALUES (
  'tenant-uuid',
  'Critical Ticket Escalation',
  ARRAY['HIGH', 'URGENT', 'CRITICAL'],
  ARRAY['SEV1', 'SEV2'],
  ARRAY['ENTERPRISE', 'PREMIUM'],
  30, -- Escalate if no response in 30 min
  120, -- Escalate if not resolved in 2 hours
  80.0, -- Escalate at 80% of SLA
  'senior-engineer-uuid',
  'escalation-team',
  ARRAY['manager-uuid', 'director-uuid'],
  true -- Increase priority
);
```

### Manual Escalation

Support agents can manually escalate:

```typescript
await ticketService.updateTicket(ticketId, {
  priority: 'URGENT',
  assignedTo: 'senior-engineer-uuid',
  assignedTeam: 'escalation-team'
});

await ticketService.addComment(
  ticketId,
  userId,
  'Escalating to senior engineering due to complexity',
  true // internal comment
);
```

## Best Practices

### Proactive Management

1. **Monitor Dashboard**: Review SLA dashboard daily
2. **Early Escalation**: Don't wait for breaches
3. **Communication**: Keep customers informed of progress
4. **Resource Planning**: Ensure adequate coverage
5. **Automation**: Use escalation rules effectively

### Response Time Optimization

1. **Auto-Assignment**: Configure routing rules
2. **Templates**: Use canned responses for speed
3. **Knowledge Base**: Link to relevant articles
4. **Triage Process**: Prioritize correctly
5. **Shift Coverage**: Ensure 24/7 availability for premium tiers

### Resolution Time Optimization

1. **Root Cause Analysis**: Identify recurring issues
2. **Knowledge Sharing**: Document solutions
3. **Engineering Escalation**: Involve product team early
4. **Customer Collaboration**: Get quick feedback
5. **Quality Assurance**: Verify fixes thoroughly

### Reporting and Analysis

1. **Weekly Reviews**: Review SLA performance weekly
2. **Trend Analysis**: Identify patterns in breaches
3. **Customer Reviews**: Discuss SLA in QBRs
4. **Process Improvement**: Use data to improve processes
5. **Capacity Planning**: Plan for growth

## Dashboards and Reporting

### Real-Time SLA Dashboard

Key metrics to display:

- Current SLA compliance rate
- Tickets at risk of breach
- Average response/resolution times
- Open breaches requiring acknowledgment
- Credits issued this month
- Per-tier performance

### Executive Reports

Monthly executive summary:

```sql
-- Executive SLA Summary
WITH monthly_stats AS (
  SELECT
    sla_tier,
    COUNT(*) as total_tickets,
    AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60) as avg_response_min,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as avg_resolution_min,
    COUNT(*) FILTER (WHERE first_response_at <= response_due_at)::float / NULLIF(COUNT(*), 0) * 100 as response_compliance,
    COUNT(*) FILTER (WHERE resolved_at <= resolution_due_at)::float / NULLIF(COUNT(*), 0) * 100 as resolution_compliance
  FROM support_tickets
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY sla_tier
),
breach_stats AS (
  SELECT
    st.sla_tier,
    COUNT(sb.id) as total_breaches,
    SUM(sb.credit_amount) as total_credits
  FROM sla_breaches sb
  JOIN support_tickets st ON sb.ticket_id = st.id
  WHERE sb.created_at >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY st.sla_tier
)
SELECT
  ms.sla_tier,
  ms.total_tickets,
  ms.avg_response_min,
  ms.avg_resolution_min,
  ROUND(ms.response_compliance, 2) as response_compliance_pct,
  ROUND(ms.resolution_compliance, 2) as resolution_compliance_pct,
  COALESCE(bs.total_breaches, 0) as breaches,
  COALESCE(bs.total_credits, 0) as credits_issued
FROM monthly_stats ms
LEFT JOIN breach_stats bs ON ms.sla_tier = bs.sla_tier
ORDER BY ms.sla_tier;
```

## Troubleshooting

### Common Issues

#### High Breach Rate

**Symptoms**: Compliance < 90%

**Causes**:
- Understaffing
- Complex issues
- Process inefficiencies
- Poor triaging

**Solutions**:
- Add support capacity
- Improve knowledge base
- Streamline processes
- Enhance training

#### Long Response Times

**Symptoms**: Avg response > target

**Causes**:
- Ticket backlog
- Poor routing
- After-hours tickets
- Resource constraints

**Solutions**:
- Improve auto-assignment
- Add shift coverage
- Use escalation rules
- Monitor queue depth

#### Credit Accumulation

**Symptoms**: High credit percentages

**Causes**:
- Systemic SLA issues
- Unrealistic SLA targets
- Infrastructure problems
- Process gaps

**Solutions**:
- Review SLA definitions
- Infrastructure improvements
- Process optimization
- Customer communication

## Conclusion

Effective SLA management requires:
- Clear definitions and commitments
- Automated monitoring and alerting
- Proactive escalation
- Regular reporting and analysis
- Continuous improvement

The Summit SLA Management system provides the tools and automation to deliver on these commitments and maintain world-class support operations.

For questions or assistance, contact the Support Operations team.
