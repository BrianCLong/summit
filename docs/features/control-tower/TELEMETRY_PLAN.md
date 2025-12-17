# Control Tower - Telemetry & Analytics Plan

> **Version**: 1.0
> **Last Updated**: 2025-12-07
> **Owner**: Product Vertical Team

---

## 1. Overview

This document defines the telemetry strategy for Control Tower, ensuring we can measure feature success, understand user behavior, and prove value to stakeholders.

### Telemetry Principles

1. **Privacy-First**: Collect only what's needed, anonymize where possible
2. **Actionable**: Every metric should drive a decision
3. **Real-Time**: Enable live monitoring and alerting
4. **Auditable**: Full provenance chain for compliance
5. **Performant**: < 5ms overhead for instrumentation

---

## 2. Event Taxonomy

### 2.1 Event Naming Convention

```
{domain}.{entity}.{action}[.{detail}]
```

Examples:
- `control_tower.dashboard.viewed`
- `control_tower.event.clicked.detail`
- `control_tower.situation.created`
- `control_tower.action.executed.escalate`

### 2.2 Common Properties (All Events)

```typescript
interface BaseEvent {
  // Identity
  event_id: string;           // UUID v7 (time-sortable)
  event_name: string;         // Taxonomy name
  event_version: string;      // Schema version (semver)

  // Timing
  timestamp: string;          // ISO 8601 UTC
  client_timestamp: string;   // Client-side timestamp

  // Context
  session_id: string;         // Browser session
  user_id: string;            // Authenticated user (hashed)
  tenant_id: string;          // Organization
  environment: string;        // prod, staging, dev

  // Client
  client_type: 'web' | 'api' | 'mobile';
  client_version: string;     // App version
  user_agent: string;         // Browser/device info

  // Feature
  feature: 'control_tower';
  feature_version: string;

  // Provenance
  trace_id: string;           // OpenTelemetry trace
  span_id: string;            // OpenTelemetry span
}
```

---

## 3. Event Catalog

### 3.1 Navigation Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `control_tower.dashboard.viewed` | User opens Control Tower | `entry_point`, `referrer` |
| `control_tower.dashboard.left` | User leaves Control Tower | `exit_target`, `time_on_page` |
| `control_tower.tab.switched` | User switches dashboard tab | `from_tab`, `to_tab` |
| `control_tower.command_palette.opened` | User opens ⌘K | `trigger_method` |
| `control_tower.command_palette.searched` | User searches in palette | `query`, `result_count` |
| `control_tower.command_palette.selected` | User selects palette item | `item_type`, `item_id` |

### 3.2 Event Timeline Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `control_tower.timeline.viewed` | Timeline becomes visible | `visible_events`, `filter_state` |
| `control_tower.timeline.scrolled` | User scrolls timeline | `scroll_direction`, `events_loaded` |
| `control_tower.timeline.filtered` | User applies filter | `filter_type`, `filter_value`, `result_count` |
| `control_tower.timeline.event.clicked` | User clicks event | `event_id`, `event_type`, `event_severity` |
| `control_tower.timeline.event.expanded` | Event details expanded | `event_id`, `expand_method` |

### 3.3 Event Detail Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `control_tower.event_detail.viewed` | Event detail panel opened | `event_id`, `event_type` |
| `control_tower.event_detail.closed` | Event detail panel closed | `event_id`, `time_viewing` |
| `control_tower.event_detail.context_graph.viewed` | User views context graph | `event_id`, `entities_shown` |
| `control_tower.event_detail.context_graph.expanded` | User expands graph view | `event_id` |
| `control_tower.event_detail.related_event.clicked` | User clicks related event | `source_event_id`, `target_event_id` |
| `control_tower.event_detail.suggestion.viewed` | AI suggestion displayed | `event_id`, `suggestion_type` |
| `control_tower.event_detail.suggestion.clicked` | User clicks suggestion | `suggestion_id`, `suggestion_type` |

### 3.4 Situation Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `control_tower.situation.viewed` | Situation card viewed | `situation_id`, `severity` |
| `control_tower.situation.clicked` | User clicks situation | `situation_id`, `severity` |
| `control_tower.situation.created` | New situation created | `situation_id`, `event_count`, `creation_method` |
| `control_tower.situation.updated` | Situation modified | `situation_id`, `field_changed`, `old_value`, `new_value` |
| `control_tower.situation.resolved` | Situation marked resolved | `situation_id`, `resolution_time`, `resolution_type` |
| `control_tower.situation.escalated` | Situation escalated | `situation_id`, `escalation_target` |
| `control_tower.situation.event.linked` | Event linked to situation | `situation_id`, `event_id` |
| `control_tower.situation.event.unlinked` | Event unlinked | `situation_id`, `event_id` |

### 3.5 Action Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `control_tower.action.initiated` | User starts action | `action_type`, `target_id`, `target_type` |
| `control_tower.action.completed` | Action completes | `action_type`, `target_id`, `success`, `duration_ms` |
| `control_tower.action.failed` | Action fails | `action_type`, `target_id`, `error_code`, `error_message` |
| `control_tower.action.cancelled` | User cancels action | `action_type`, `target_id`, `cancel_reason` |
| `control_tower.playbook.triggered` | Playbook execution starts | `playbook_id`, `trigger_source` |
| `control_tower.playbook.completed` | Playbook completes | `playbook_id`, `success`, `steps_executed` |
| `control_tower.notification.sent` | Notification dispatched | `channel`, `recipient_count`, `template_id` |

### 3.6 Alert Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `control_tower.alert.triggered` | Alert rule fires | `rule_id`, `severity`, `event_id` |
| `control_tower.alert.acknowledged` | User acknowledges alert | `alert_id`, `ack_method` |
| `control_tower.alert.snoozed` | User snoozes alert | `alert_id`, `snooze_duration` |
| `control_tower.alert.dismissed` | User dismisses alert | `alert_id`, `dismiss_reason` |
| `control_tower.alert_rule.created` | New alert rule created | `rule_id`, `conditions` |
| `control_tower.alert_rule.updated` | Alert rule modified | `rule_id`, `field_changed` |
| `control_tower.alert_rule.deleted` | Alert rule removed | `rule_id` |

### 3.7 Health Score Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `control_tower.health_score.calculated` | Health score computed | `score`, `components`, `trend` |
| `control_tower.health_score.clicked` | User clicks health score | `score`, `click_area` |
| `control_tower.health_score.drill_down` | User drills into component | `component`, `component_score` |

### 3.8 Search Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `control_tower.search.initiated` | Search started | `query`, `search_scope` |
| `control_tower.search.completed` | Search results returned | `query`, `result_count`, `duration_ms` |
| `control_tower.search.result.clicked` | User clicks result | `query`, `result_id`, `result_position` |
| `control_tower.search.no_results` | Search returns empty | `query`, `search_scope` |

### 3.9 Performance Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `control_tower.page.loaded` | Page load complete | `load_time_ms`, `ttfb_ms`, `fcp_ms`, `lcp_ms` |
| `control_tower.api.called` | API request made | `endpoint`, `method`, `duration_ms`, `status_code` |
| `control_tower.realtime.connected` | WebSocket connected | `connection_time_ms` |
| `control_tower.realtime.disconnected` | WebSocket disconnected | `reason`, `duration_connected` |
| `control_tower.realtime.event.received` | Real-time event received | `event_type`, `latency_ms` |

---

## 4. Event Schemas (JSON Schema)

### 4.1 Dashboard Viewed Event

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "control_tower.dashboard.viewed",
  "type": "object",
  "required": ["event_id", "event_name", "timestamp", "user_id", "tenant_id"],
  "properties": {
    "event_id": { "type": "string", "format": "uuid" },
    "event_name": { "const": "control_tower.dashboard.viewed" },
    "event_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "timestamp": { "type": "string", "format": "date-time" },
    "user_id": { "type": "string" },
    "tenant_id": { "type": "string" },
    "session_id": { "type": "string" },
    "properties": {
      "type": "object",
      "properties": {
        "entry_point": {
          "type": "string",
          "enum": ["direct", "navigation", "notification", "search", "deeplink"]
        },
        "referrer": { "type": "string" },
        "active_situations_count": { "type": "integer" },
        "health_score": { "type": "number" },
        "unread_alerts_count": { "type": "integer" }
      }
    }
  }
}
```

### 4.2 Action Completed Event

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "control_tower.action.completed",
  "type": "object",
  "required": ["event_id", "event_name", "timestamp", "user_id", "properties"],
  "properties": {
    "event_id": { "type": "string", "format": "uuid" },
    "event_name": { "const": "control_tower.action.completed" },
    "timestamp": { "type": "string", "format": "date-time" },
    "user_id": { "type": "string" },
    "tenant_id": { "type": "string" },
    "properties": {
      "type": "object",
      "required": ["action_type", "target_id", "success"],
      "properties": {
        "action_type": {
          "type": "string",
          "enum": ["acknowledge", "escalate", "resolve", "reassign", "snooze", "comment", "run_playbook", "notify"]
        },
        "target_type": {
          "type": "string",
          "enum": ["event", "situation", "alert"]
        },
        "target_id": { "type": "string" },
        "success": { "type": "boolean" },
        "duration_ms": { "type": "integer" },
        "error_code": { "type": "string" },
        "metadata": { "type": "object" }
      }
    }
  }
}
```

---

## 5. Metrics & KPIs

### 5.1 Product Metrics

| Metric | Definition | Calculation | Target |
|--------|------------|-------------|--------|
| **Daily Active Users (DAU)** | Unique users per day | `COUNT(DISTINCT user_id) WHERE date = today` | 80% of ops team |
| **Session Duration** | Time per session | `AVG(session_end - session_start)` | 15-45 min |
| **Events per Session** | User engagement depth | `COUNT(events) / COUNT(sessions)` | > 20 |
| **Action Rate** | % of views → actions | `COUNT(action.completed) / COUNT(event_detail.viewed)` | > 40% |
| **Time to First Action** | Onboarding speed | `MIN(action.completed.timestamp) - dashboard.viewed.timestamp` | < 2 min |
| **Return Rate** | Next-day retention | `DAU(day+1) / DAU(day)` | > 90% |
| **Feature Adoption** | % using each feature | `COUNT(DISTINCT user_id WHERE feature_used) / DAU` | > 60% |

### 5.2 Operational Metrics

| Metric | Definition | Calculation | Target |
|--------|------------|-------------|--------|
| **Mean Time to Awareness (MTTA)** | Event detection speed | `event.clicked.timestamp - event.created_at` | < 5 min |
| **Mean Time to Action (MTTA)** | Response initiation | `action.initiated.timestamp - event.created_at` | < 15 min |
| **Mean Time to Resolution (MTTR)** | Full resolution time | `situation.resolved.timestamp - situation.created.timestamp` | < 2 hours |
| **Escalation Rate** | % requiring escalation | `COUNT(escalated) / COUNT(situations)` | < 20% |
| **Alert Fatigue Score** | Ignored alerts ratio | `COUNT(dismissed) / COUNT(triggered)` | < 30% |
| **Correlation Accuracy** | Correct auto-groupings | `manual_confirmations / auto_correlations` | > 80% |

### 5.3 Reliability Metrics (SLIs)

| Metric | Definition | Target SLO |
|--------|------------|------------|
| **Availability** | Successful requests / total | 99.9% |
| **Latency (p50)** | Dashboard load time | < 500ms |
| **Latency (p95)** | Dashboard load time | < 1500ms |
| **Latency (p99)** | Dashboard load time | < 3000ms |
| **Event Freshness** | Source → display latency | < 5 seconds |
| **Error Rate** | Failed requests / total | < 0.1% |
| **WebSocket Uptime** | Connected time / session time | > 99% |

---

## 6. Implementation

### 6.1 Client-Side Instrumentation

```typescript
// packages/control-tower-analytics/src/tracker.ts

import { v7 as uuidv7 } from 'uuid';

interface TrackOptions {
  immediate?: boolean;
  sampling?: number;
}

class ControlTowerTracker {
  private queue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId: string;
  private tenantId: string;

  constructor(config: TrackerConfig) {
    this.sessionId = this.getOrCreateSessionId();
    this.userId = config.userId;
    this.tenantId = config.tenantId;

    // Flush queue periodically
    setInterval(() => this.flush(), 5000);

    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush(true));
  }

  track(eventName: string, properties: Record<string, unknown>, options?: TrackOptions): void {
    // Sampling
    if (options?.sampling && Math.random() > options.sampling) {
      return;
    }

    const event: AnalyticsEvent = {
      event_id: uuidv7(),
      event_name: eventName,
      event_version: '1.0.0',
      timestamp: new Date().toISOString(),
      client_timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      user_id: this.userId,
      tenant_id: this.tenantId,
      environment: process.env.NODE_ENV,
      client_type: 'web',
      client_version: __APP_VERSION__,
      feature: 'control_tower',
      feature_version: __FEATURE_VERSION__,
      trace_id: this.getTraceId(),
      span_id: this.getSpanId(),
      properties,
    };

    if (options?.immediate) {
      this.send([event]);
    } else {
      this.queue.push(event);
    }
  }

  // Convenience methods
  trackPageView(page: string, properties?: Record<string, unknown>): void {
    this.track(`control_tower.${page}.viewed`, {
      ...properties,
      page_url: window.location.href,
      referrer: document.referrer,
    });
  }

  trackAction(actionType: string, targetType: string, targetId: string, success: boolean, metadata?: Record<string, unknown>): void {
    this.track('control_tower.action.completed', {
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      success,
      ...metadata,
    });
  }

  trackTiming(operation: string, durationMs: number, metadata?: Record<string, unknown>): void {
    this.track('control_tower.timing', {
      operation,
      duration_ms: durationMs,
      ...metadata,
    });
  }

  private async flush(sync = false): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    if (sync && navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/events', JSON.stringify(events));
    } else {
      await this.send(events);
    }
  }

  private async send(events: AnalyticsEvent[]): Promise<void> {
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      // Re-queue on failure
      this.queue.unshift(...events);
      console.error('Analytics send failed:', error);
    }
  }
}

export const tracker = new ControlTowerTracker({
  userId: getCurrentUserId(),
  tenantId: getCurrentTenantId(),
});
```

### 6.2 React Hooks

```typescript
// packages/control-tower-analytics/src/hooks.ts

import { useEffect, useCallback, useRef } from 'react';
import { tracker } from './tracker';

// Track page view on mount
export function usePageView(page: string, properties?: Record<string, unknown>): void {
  const startTime = useRef(Date.now());

  useEffect(() => {
    tracker.trackPageView(page, properties);

    return () => {
      tracker.track(`control_tower.${page}.left`, {
        time_on_page_ms: Date.now() - startTime.current,
      });
    };
  }, [page]);
}

// Track element visibility
export function useVisibilityTracking(
  ref: React.RefObject<HTMLElement>,
  eventName: string,
  properties?: Record<string, unknown>
): void {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            tracker.track(eventName, {
              ...properties,
              visibility_ratio: entry.intersectionRatio,
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, eventName]);
}

// Track action with timing
export function useActionTracking(): {
  trackAction: (actionType: string, targetType: string, targetId: string, action: () => Promise<void>) => Promise<void>;
} {
  const trackAction = useCallback(
    async (actionType: string, targetType: string, targetId: string, action: () => Promise<void>) => {
      const startTime = Date.now();
      tracker.track('control_tower.action.initiated', {
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
      });

      try {
        await action();
        tracker.trackAction(actionType, targetType, targetId, true, {
          duration_ms: Date.now() - startTime,
        });
      } catch (error) {
        tracker.trackAction(actionType, targetType, targetId, false, {
          duration_ms: Date.now() - startTime,
          error_code: error.code,
          error_message: error.message,
        });
        throw error;
      }
    },
    []
  );

  return { trackAction };
}

// Track search
export function useSearchTracking(): {
  trackSearch: (query: string, scope: string) => void;
  trackSearchResult: (query: string, resultId: string, position: number) => void;
} {
  const searchStartTime = useRef<number>();

  const trackSearch = useCallback((query: string, scope: string) => {
    searchStartTime.current = Date.now();
    tracker.track('control_tower.search.initiated', { query, search_scope: scope });
  }, []);

  const trackSearchResult = useCallback((query: string, resultId: string, position: number) => {
    tracker.track('control_tower.search.result.clicked', {
      query,
      result_id: resultId,
      result_position: position,
      time_to_click_ms: searchStartTime.current ? Date.now() - searchStartTime.current : undefined,
    });
  }, []);

  return { trackSearch, trackSearchResult };
}
```

### 6.3 Server-Side Collection

```typescript
// services/control-tower-service/src/analytics/collector.ts

import { Kafka } from 'kafkajs';
import { validateEvent } from './schemas';
import { enrichEvent } from './enrichment';

const kafka = new Kafka({
  clientId: 'control-tower-analytics',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
});

const producer = kafka.producer();

export async function collectEvents(events: AnalyticsEvent[]): Promise<void> {
  await producer.connect();

  const messages = await Promise.all(
    events.map(async (event) => {
      // Validate against schema
      const validation = validateEvent(event);
      if (!validation.valid) {
        console.warn('Invalid event:', validation.errors);
        return null;
      }

      // Enrich with server-side data
      const enrichedEvent = await enrichEvent(event);

      return {
        key: enrichedEvent.user_id,
        value: JSON.stringify(enrichedEvent),
        headers: {
          'event-type': enrichedEvent.event_name,
          'event-version': enrichedEvent.event_version,
        },
      };
    })
  );

  await producer.send({
    topic: 'control-tower-analytics',
    messages: messages.filter(Boolean),
  });
}

// Enrichment adds server-side context
async function enrichEvent(event: AnalyticsEvent): Promise<EnrichedEvent> {
  return {
    ...event,
    server_timestamp: new Date().toISOString(),
    geo: await geolocate(event.ip_address),
    user_segment: await getUserSegment(event.user_id),
    tenant_tier: await getTenantTier(event.tenant_id),
  };
}
```

---

## 7. Data Pipeline

### 7.1 Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│  API Layer  │───▶│    Kafka    │───▶│   ClickHouse │
│  (Browser)  │    │  (Collect)  │    │  (Stream)   │    │   (Store)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                             │
                                             ▼
                                      ┌─────────────┐
                                      │   Flink     │
                                      │ (Real-time) │
                                      └─────────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          ▼                  ▼                  ▼
                   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
                   │  Prometheus │   │    Redis    │   │   Alerts    │
                   │  (Metrics)  │   │  (Counters) │   │  (PagerDuty)│
                   └─────────────┘   └─────────────┘   └─────────────┘
```

### 7.2 Real-Time Processing

```typescript
// Flink job for real-time aggregations
const realTimeMetrics = [
  {
    name: 'active_users_1m',
    window: '1 minute',
    aggregation: 'COUNT DISTINCT user_id',
  },
  {
    name: 'events_per_second',
    window: '10 seconds',
    aggregation: 'COUNT(*) / 10',
  },
  {
    name: 'action_success_rate_5m',
    window: '5 minutes',
    aggregation: 'SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*)',
    filter: "event_name = 'control_tower.action.completed'",
  },
  {
    name: 'p95_latency_1m',
    window: '1 minute',
    aggregation: 'PERCENTILE(duration_ms, 0.95)',
    filter: "event_name = 'control_tower.api.called'",
  },
];
```

---

## 8. Dashboards & Reporting

### 8.1 Operational Dashboard (Grafana)

**Panels:**
1. Active Users (real-time counter)
2. Events per Second (time series)
3. Action Success Rate (gauge)
4. P95 Latency (time series)
5. Error Rate (time series)
6. Top Events by Volume (bar chart)
7. User Journey Funnel (funnel)
8. Geographic Distribution (map)

### 8.2 Product Analytics Dashboard

**Panels:**
1. DAU/WAU/MAU Trend
2. Feature Adoption Matrix
3. User Retention Cohorts
4. Session Duration Distribution
5. Time to First Action
6. Action Rate by User Segment
7. Search Query Analysis
8. Alert Effectiveness

### 8.3 Executive Summary Report (Weekly)

```markdown
# Control Tower Weekly Report

## Highlights
- DAU: 142 users (+12% WoW)
- Avg Session Duration: 23 min
- Action Rate: 47% (+5% WoW)
- MTTA: 4.2 min (-18% WoW)

## Feature Adoption
| Feature | This Week | Last Week | Change |
|---------|-----------|-----------|--------|
| Event Timeline | 98% | 97% | +1% |
| Situations | 78% | 72% | +6% |
| AI Suggestions | 45% | 38% | +7% |
| Playbooks | 34% | 31% | +3% |

## Value Delivered
- 127 situations resolved
- Avg resolution time: 1.8 hours
- Estimated time saved: 42 hours
- Escalation rate: 15% (target: <20%)
```

---

## 9. Privacy & Compliance

### 9.1 Data Classification

| Data Type | Classification | Retention | PII |
|-----------|----------------|-----------|-----|
| Event metadata | Internal | 90 days | No |
| User IDs | Confidential | 90 days | Yes (hashed) |
| Session data | Internal | 30 days | No |
| Error details | Internal | 30 days | Possible |
| Search queries | Confidential | 7 days | Possible |

### 9.2 Privacy Controls

```typescript
// Automatic PII scrubbing
const piiPatterns = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone
  /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, // SSN
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, // Credit card
];

function scrubPII(text: string): string {
  let scrubbed = text;
  piiPatterns.forEach((pattern) => {
    scrubbed = scrubbed.replace(pattern, '[REDACTED]');
  });
  return scrubbed;
}
```

### 9.3 User Consent

- Analytics collection requires active session
- Users can opt-out via settings
- Opt-out is respected across all touchpoints
- Data deletion available on request (GDPR)

---

## 10. Alerting

### 10.1 Operational Alerts

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| High Error Rate | Error rate > 1% for 5 min | Critical | PagerDuty |
| Latency Spike | P95 > 3s for 5 min | Warning | Slack |
| WebSocket Failures | Disconnection rate > 10% | Warning | Slack |
| Event Pipeline Lag | Lag > 30s | Critical | PagerDuty |
| Zero Active Users | DAU = 0 during business hours | Critical | PagerDuty |

### 10.2 Product Alerts

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| Adoption Drop | Feature usage -20% WoW | Warning | Email |
| Action Rate Drop | Action rate < 30% | Warning | Slack |
| Session Duration Drop | Avg session < 5 min | Info | Email |
| High Alert Dismissal | Dismiss rate > 50% | Warning | Slack |

---

## 11. Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Kafka topics for analytics
- [ ] Implement client-side tracker
- [ ] Create API endpoint for event collection
- [ ] Set up ClickHouse schema
- [ ] Implement basic validation

### Phase 2: Instrumentation (Week 3-4)
- [ ] Add page view tracking
- [ ] Add action tracking
- [ ] Add timing instrumentation
- [ ] Add error tracking
- [ ] Add search tracking

### Phase 3: Pipeline (Week 5-6)
- [ ] Set up Flink jobs for real-time aggregation
- [ ] Configure Prometheus metrics export
- [ ] Set up ClickHouse materialized views
- [ ] Implement data retention policies

### Phase 4: Visualization (Week 7-8)
- [ ] Create Grafana operational dashboard
- [ ] Create product analytics dashboard
- [ ] Set up automated reports
- [ ] Configure alerting rules

### Phase 5: Validation (Week 9)
- [ ] Validate data accuracy
- [ ] Test privacy controls
- [ ] Performance testing
- [ ] Documentation

---

## Appendix A: Event Schema Registry

All event schemas are registered in the schema registry at:
`/packages/control-tower-analytics/schemas/`

Schema changes follow semantic versioning:
- **Major**: Breaking changes (field removal, type change)
- **Minor**: New optional fields
- **Patch**: Documentation updates

---

## Appendix B: Query Examples

### Most Common Actions

```sql
SELECT
  properties.action_type,
  COUNT(*) as count,
  AVG(properties.duration_ms) as avg_duration_ms,
  SUM(CASE WHEN properties.success THEN 1 ELSE 0 END) / COUNT(*) as success_rate
FROM control_tower_events
WHERE event_name = 'control_tower.action.completed'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY properties.action_type
ORDER BY count DESC;
```

### User Journey Funnel

```sql
WITH funnel AS (
  SELECT
    user_id,
    MIN(CASE WHEN event_name = 'control_tower.dashboard.viewed' THEN timestamp END) as viewed,
    MIN(CASE WHEN event_name = 'control_tower.event_detail.viewed' THEN timestamp END) as event_viewed,
    MIN(CASE WHEN event_name = 'control_tower.action.initiated' THEN timestamp END) as action_started,
    MIN(CASE WHEN event_name = 'control_tower.action.completed' AND properties.success THEN timestamp END) as action_completed
  FROM control_tower_events
  WHERE timestamp > now() - INTERVAL 7 DAY
  GROUP BY user_id
)
SELECT
  COUNT(DISTINCT CASE WHEN viewed IS NOT NULL THEN user_id END) as step1_dashboard,
  COUNT(DISTINCT CASE WHEN event_viewed IS NOT NULL THEN user_id END) as step2_event_detail,
  COUNT(DISTINCT CASE WHEN action_started IS NOT NULL THEN user_id END) as step3_action_started,
  COUNT(DISTINCT CASE WHEN action_completed IS NOT NULL THEN user_id END) as step4_action_completed
FROM funnel;
```

### Time to First Action by Cohort

```sql
SELECT
  DATE_TRUNC('week', first_seen) as cohort_week,
  AVG(EXTRACT(EPOCH FROM (first_action - first_seen))) as avg_seconds_to_action,
  COUNT(DISTINCT user_id) as users
FROM (
  SELECT
    user_id,
    MIN(CASE WHEN event_name = 'control_tower.dashboard.viewed' THEN timestamp END) as first_seen,
    MIN(CASE WHEN event_name = 'control_tower.action.completed' THEN timestamp END) as first_action
  FROM control_tower_events
  GROUP BY user_id
) user_actions
WHERE first_action IS NOT NULL
GROUP BY cohort_week
ORDER BY cohort_week;
```
