# Oncall README

## Severity Rubric

### SEV-1 (Critical)
- Complete service outage (>90% unavailable)
- Data loss or corruption
- Security breach
- Financial impact >$10K/hr

### SEV-2 (High)
- Partial service degradation (>50% impacted)
- Performance degradation (p95 > 2x baseline)
- Non-critical data issues
- Financial impact <$10K/hr

### SEV-3 (Medium)
- Minor service issues (<50% impacted)
- Minor performance issues (p95 > 1.5x baseline)
- User-facing bugs affecting small cohort

### SEV-4 (Low)
- Minor bugs
- Documentation issues
- Feature requests

## Paging Path

1. **Primary**: [oncall-primary@example.com]
2. **Secondary**: [oncall-secondary@example.com]
3. **Manager**: [manager@example.com]

## First 10 Minutes Checklist

When paged:

1. **Acknowledge** - Respond to page within 5 minutes
2. **Assess** - Check system status:
   - `make ps` - Service status
   - `make logs` - Recent errors
   - Grafana dashboards - Metrics anomalies
   - Alertmanager - Active alerts
3. **Classify** - Determine severity level
4. **Communicate** - Post status in #incidents channel
5. **Act** - Begin mitigation steps

## Common Mitigation Steps

### Service Down
1. Check `docker ps` for crashed containers
2. Check logs with `make logs`
3. Restart with `make down && make up`
4. Escalate if persists

### Performance Degradation
1. Check resource usage (CPU, memory, disk)
2. Check active connections and queue depths
3. Review recent deployments
4. Consider horizontal scaling

### Data Issues
1. Check database connectivity and queries
2. Review recent write operations
3. Check backup status and restoration procedure
4. Engage data team if needed

## Communication Protocol

### Internal
- **#incidents** - Real-time status updates
- **#oncall** - Handoff and shift changes
- **Direct messages** - Specific coordination

### External
- **Status page** - Customer-facing updates
- **Support tickets** - Customer inquiries
- **Executive briefings** - Major incidents (>30min)

## Shift Handoff

### Information to Transfer
1. Current open incidents
2. Pending action items
3. Known issues requiring attention
4. System health observations
5. Any unusual activity noted

### Handoff Process
1. Schedule 30-minute overlap
2. Walk through open issues
3. Update shared documentation
4. Confirm contact information is current