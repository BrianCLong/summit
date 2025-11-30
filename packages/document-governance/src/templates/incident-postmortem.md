# Incident Postmortem

## Incident Summary

| Field | Value |
|-------|-------|
| **Incident ID** | {{ incident_id }} |
| **Service(s) Affected** | {{ services }} |
| **Severity** | {{ severity }} |
| **Start Time** | {{ start_time }} |
| **End Time** | {{ end_time }} |
| **Duration** | {{ duration }} |
| **Incident Commander** | {{ incident_commander }} |
| **Reporter** | {{ reporter }} |

## 1. Executive Summary

{{ executive_summary }}

## 2. Impact

### Customer Impact
{{ customer_impact }}

### Business Impact
- **Users Affected:** {{ users_affected }}
- **Revenue Impact:** {{ revenue_impact }}
- **SLA Violations:** {{ sla_violations }}

## 3. Timeline

| Time (UTC) | Event | Actor |
|------------|-------|-------|
{{ timeline_entries }}

## 4. Root Cause Analysis

### Technical Root Cause
{{ technical_root_cause }}

### Contributing Factors
{{ contributing_factors }}

### 5 Whys Analysis
1. {{ why_1 }}
2. {{ why_2 }}
3. {{ why_3 }}
4. {{ why_4 }}
5. {{ why_5 }}

## 5. Detection & Response

### How Was It Detected?
{{ detection_method }}

### Response Metrics
- **Time to Detect (TTD):** {{ ttd }}
- **Time to Acknowledge (TTA):** {{ tta }}
- **Time to Mitigate (TTM):** {{ ttm }}
- **Time to Resolve (TTR):** {{ ttr }}

## 6. What Went Well

{{ what_went_well }}

## 7. What Went Wrong

{{ what_went_wrong }}

## 8. Lessons Learned

{{ lessons_learned }}

## 9. Corrective and Preventive Actions (CAPA)

### Immediate Actions (Completed)
{{ immediate_actions }}

### Short-term Fixes (1-2 weeks)
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
{{ short_term_actions }}

### Long-term Fixes (1-3 months)
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
{{ long_term_actions }}

## 10. Links & References

- **Incident Ticket:** {{ incident_ticket }}
- **Related Runbooks:** {{ related_runbooks }}
- **Monitoring Dashboards:** {{ dashboards }}
- **Logs:** {{ log_links }}

---
*Document ID: {{ document_id }}*
*Classification: {{ classification }}*
*Created: {{ created_at }}*
*Last Updated: {{ updated_at }}*
