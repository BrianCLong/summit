# Complex Event Processing (CEP) Patterns

## Overview

This guide provides comprehensive examples of CEP patterns for intelligence analysis, security monitoring, and operational intelligence.

## Pattern Types

### 1. Sequence Patterns

Detect specific sequences of events in order.

#### Example: Account Takeover Detection

```typescript
const accountTakeoverPattern: EventPattern = {
  id: 'account-takeover',
  name: 'Account Takeover Detection',
  description: 'Detects suspicious login pattern indicating account compromise',
  conditions: [
    {
      field: 'eventType',
      operator: 'eq',
      value: 'auth.login.failed',
      eventType: 'auth.login.failed',
    },
    {
      field: 'attempts',
      operator: 'gte',
      value: 3,
    },
    {
      field: 'eventType',
      operator: 'eq',
      value: 'auth.password.reset',
      eventType: 'auth.password.reset',
    },
    {
      field: 'eventType',
      operator: 'eq',
      value: 'auth.login.success',
      eventType: 'auth.login.success',
    },
    {
      field: 'geolocation.country',
      operator: 'ne',
      value: 'previous_country', // Pseudo-code
    },
  ],
  windowConfig: {
    type: 'sliding',
    size: 3600000, // 1 hour
  },
  action: {
    type: 'alert',
    config: {
      severity: 'critical',
      title: 'Potential Account Takeover',
      notify: ['security-ops', 'user-owner'],
    },
  },
};
```

### 2. Threshold Patterns

Trigger when metrics exceed thresholds.

#### Example: DDoS Detection

```typescript
const ddosPattern: EventPattern = {
  id: 'ddos-detection',
  name: 'DDoS Attack Detection',
  description: 'Detects abnormal spike in requests from single source',
  conditions: [
    {
      field: 'eventType',
      operator: 'eq',
      value: 'http.request',
    },
    {
      field: 'sourceIP',
      operator: 'exists',
    },
  ],
  windowConfig: {
    type: 'tumbling',
    size: 60000, // 1 minute
  },
  action: {
    type: 'custom',
    config: {},
    handler: async (events) => {
      // Group by source IP
      const ipCounts = new Map<string, number>();

      for (const event of events) {
        const ip = event.metadata?.sourceIP;
        ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
      }

      // Check for IPs exceeding threshold
      for (const [ip, count] of ipCounts) {
        if (count > 1000) { // 1000 requests per minute
          await generateAlert({
            severity: 'high',
            title: 'Possible DDoS Attack',
            description: `${count} requests from ${ip} in 1 minute`,
            sourceIP: ip,
          });
        }
      }
    },
  },
};
```

### 3. Absence Patterns

Detect when expected events don't occur.

#### Example: Heartbeat Monitoring

```typescript
const heartbeatMissingPattern: EventPattern = {
  id: 'heartbeat-missing',
  name: 'Missing Heartbeat Detection',
  description: 'Detects when system heartbeat stops',
  conditions: [
    {
      field: 'eventType',
      operator: 'eq',
      value: 'system.heartbeat',
    },
  ],
  windowConfig: {
    type: 'session',
    size: 300000, // 5 minutes
    gap: 60000, // Expected every 60 seconds
  },
  action: {
    type: 'alert',
    config: {
      severity: 'critical',
      title: 'System Heartbeat Missing',
      runbook: 'ops/system-down-runbook',
    },
  },
};
```

### 4. Correlation Patterns

Correlate events across different sources.

#### Example: Coordinated Attack Detection

```typescript
const coordinatedAttackPattern: EventPattern = {
  id: 'coordinated-attack',
  name: 'Coordinated Attack Detection',
  description: 'Detects coordinated attacks from multiple sources',
  conditions: [
    {
      field: 'eventType',
      operator: 'in',
      value: ['intrusion.detected', 'malware.detected', 'data.exfiltration'],
    },
    {
      field: 'severity',
      operator: 'gte',
      value: 'high',
    },
  ],
  windowConfig: {
    type: 'sliding',
    size: 600000, // 10 minutes
  },
  action: {
    type: 'custom',
    config: {},
    handler: async (events) => {
      // Group by target
      const targets = new Map<string, any[]>();

      for (const event of events) {
        const target = event.metadata?.target;
        if (!targets.has(target)) {
          targets.set(target, []);
        }
        targets.get(target)!.push(event);
      }

      // Check for multiple attack types on same target
      for (const [target, targetEvents] of targets) {
        const attackTypes = new Set(targetEvents.map(e => e.eventType));

        if (attackTypes.size >= 2) {
          await generateAlert({
            severity: 'critical',
            title: 'Coordinated Attack Detected',
            description: `Multiple attack vectors targeting ${target}`,
            attackTypes: Array.from(attackTypes),
            target,
          });
        }
      }
    },
  },
};
```

### 5. Anomaly Patterns

Detect statistical anomalies in event streams.

#### Example: Data Exfiltration Detection

```typescript
const dataExfiltrationPattern: EventPattern = {
  id: 'data-exfiltration',
  name: 'Data Exfiltration Detection',
  description: 'Detects abnormal data transfer volumes',
  conditions: [
    {
      field: 'eventType',
      operator: 'eq',
      value: 'network.egress',
    },
  ],
  windowConfig: {
    type: 'tumbling',
    size: 300000, // 5 minutes
  },
  action: {
    type: 'custom',
    config: {},
    handler: async (events) => {
      // Calculate baseline and detect anomalies
      const userVolumes = new Map<string, number>();

      for (const event of events) {
        const user = event.metadata?.userId;
        const bytes = event.metadata?.bytes || 0;
        userVolumes.set(user, (userVolumes.get(user) || 0) + bytes);
      }

      const volumes = Array.from(userVolumes.values());
      const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      const stdDev = Math.sqrt(
        volumes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / volumes.length
      );

      for (const [user, volume] of userVolumes) {
        const zScore = (volume - mean) / stdDev;

        if (zScore > 3) { // 3 standard deviations
          await generateAlert({
            severity: 'high',
            title: 'Abnormal Data Transfer Detected',
            description: `User ${user} transferred ${volume} bytes (${zScore.toFixed(2)} std devs above normal)`,
            user,
            volume,
            zScore,
          });
        }
      }
    },
  },
};
```

## Intelligence Analysis Patterns

### Insider Threat Detection

```typescript
const insiderThreatPattern: EventPattern = {
  id: 'insider-threat',
  name: 'Insider Threat Indicators',
  description: 'Detects behavior patterns indicative of insider threat',
  conditions: [
    {
      field: 'eventType',
      operator: 'in',
      value: [
        'file.access.sensitive',
        'database.query.bulk',
        'vpn.access.unusual-time',
        'email.forward.external',
      ],
    },
  ],
  windowConfig: {
    type: 'sliding',
    size: 86400000, // 24 hours
  },
  action: {
    type: 'custom',
    config: {},
    handler: async (events) => {
      const userBehaviors = new Map<string, Set<string>>();

      for (const event of events) {
        const user = event.metadata?.userId;
        if (!userBehaviors.has(user)) {
          userBehaviors.set(user, new Set());
        }
        userBehaviors.get(user)!.add(event.eventType);
      }

      for (const [user, behaviors] of userBehaviors) {
        const riskScore = calculateRiskScore(behaviors);

        if (riskScore > 70) {
          await generateAlert({
            severity: 'critical',
            title: 'High-Risk Insider Threat Indicator',
            description: `User ${user} exhibiting ${behaviors.size} suspicious behaviors`,
            user,
            behaviors: Array.from(behaviors),
            riskScore,
          });
        }
      }
    },
  },
};
```

### Network Reconnaissance Detection

```typescript
const reconnaissancePattern: EventPattern = {
  id: 'network-recon',
  name: 'Network Reconnaissance Detection',
  description: 'Detects port scanning and network mapping activities',
  conditions: [
    {
      field: 'eventType',
      operator: 'eq',
      value: 'network.connection.new',
    },
  ],
  windowConfig: {
    type: 'tumbling',
    size: 60000, // 1 minute
  },
  action: {
    type: 'custom',
    config: {},
    handler: async (events) => {
      const sourceScans = new Map<string, Set<number>>();

      for (const event of events) {
        const source = event.metadata?.sourceIP;
        const destPort = event.metadata?.destinationPort;

        if (!sourceScans.has(source)) {
          sourceScans.set(source, new Set());
        }
        sourceScans.get(source)!.add(destPort);
      }

      for (const [source, ports] of sourceScans) {
        // Port scan: many ports from single source
        if (ports.size > 20) {
          await generateAlert({
            severity: 'high',
            title: 'Port Scan Detected',
            description: `${source} scanned ${ports.size} ports in 1 minute`,
            sourceIP: source,
            portsScanned: ports.size,
            technique: 'Port Scanning',
          });
        }
      }
    },
  },
};
```

### Lateral Movement Detection

```typescript
const lateralMovementPattern: EventPattern = {
  id: 'lateral-movement',
  name: 'Lateral Movement Detection',
  description: 'Detects lateral movement across network segments',
  conditions: [
    {
      field: 'eventType',
      operator: 'in',
      value: [
        'smb.access',
        'rdp.connection',
        'ssh.connection',
        'psexec.execution',
      ],
    },
  ],
  windowConfig: {
    type: 'sliding',
    size: 3600000, // 1 hour
  },
  action: {
    type: 'custom',
    config: {},
    handler: async (events) => {
      // Track source -> destination hops
      const movementGraph = new Map<string, Set<string>>();

      for (const event of events) {
        const source = event.metadata?.sourceHost;
        const dest = event.metadata?.destinationHost;

        if (!movementGraph.has(source)) {
          movementGraph.set(source, new Set());
        }
        movementGraph.get(source)!.add(dest);
      }

      // Detect rapid movement across multiple hosts
      for (const [source, destinations] of movementGraph) {
        if (destinations.size >= 5) {
          await generateAlert({
            severity: 'critical',
            title: 'Lateral Movement Detected',
            description: `${source} accessed ${destinations.size} different hosts`,
            sourceHost: source,
            destinationHosts: Array.from(destinations),
            hopCount: destinations.size,
          });
        }
      }
    },
  },
};
```

## Operational Intelligence Patterns

### Application Performance Degradation

```typescript
const performanceDegradationPattern: EventPattern = {
  id: 'performance-degradation',
  name: 'Application Performance Degradation',
  description: 'Detects degrading application performance metrics',
  conditions: [
    {
      field: 'eventType',
      operator: 'eq',
      value: 'app.request.completed',
    },
    {
      field: 'duration',
      operator: 'exists',
    },
  ],
  windowConfig: {
    type: 'sliding',
    size: 300000, // 5 minutes
  },
  action: {
    type: 'custom',
    config: {},
    handler: async (events) => {
      const durations = events.map(e => e.metadata?.duration).filter(Boolean);

      if (durations.length < 10) return; // Need enough samples

      const p95 = calculatePercentile(durations, 95);
      const p99 = calculatePercentile(durations, 99);

      // Check against SLA thresholds
      if (p95 > 2000 || p99 > 5000) {
        await generateAlert({
          severity: p99 > 5000 ? 'high' : 'medium',
          title: 'Application Performance Degradation',
          description: `P95: ${p95}ms, P99: ${p99}ms`,
          metrics: { p95, p99 },
        });
      }
    },
  },
};
```

## Window Types

### Tumbling Windows

Fixed, non-overlapping time windows.

```typescript
windowConfig: {
  type: 'tumbling',
  size: 300000, // 5 minutes
}
```

**Use Cases:**
- Periodic metrics aggregation
- Regular interval monitoring
- Batch processing

### Sliding Windows

Overlapping time windows that slide continuously.

```typescript
windowConfig: {
  type: 'sliding',
  size: 600000, // 10 minutes
  slide: 60000, // Slide every 1 minute
}
```

**Use Cases:**
- Moving averages
- Continuous monitoring
- Trend detection

### Session Windows

Dynamic windows based on activity gaps.

```typescript
windowConfig: {
  type: 'session',
  size: 1800000, // 30 minutes max
  gap: 300000, // 5 minutes inactivity
}
```

**Use Cases:**
- User sessions
- Activity bursts
- Interaction sequences

## Best Practices

### 1. Pattern Design

- **Be Specific**: Narrow conditions to reduce false positives
- **Test Thoroughly**: Use historical data to validate patterns
- **Consider Performance**: Complex patterns consume resources
- **Version Patterns**: Track changes to pattern definitions

### 2. Window Selection

- **Match Use Case**: Choose window type based on analysis needs
- **Size Appropriately**: Balance completeness vs. latency
- **Consider Memory**: Larger windows consume more memory
- **Align with SLAs**: Window size should support detection time requirements

### 3. Action Handlers

- **Keep Lightweight**: Don't block event processing
- **Handle Errors**: Implement proper error handling
- **Be Idempotent**: Actions may be called multiple times
- **Log Everything**: Maintain audit trail of actions

### 4. Alert Tuning

- **Set Thresholds**: Use appropriate severity levels
- **Deduplicate**: Avoid alert fatigue with deduplication
- **Enrich Context**: Include actionable information
- **Define Escalation**: Clear escalation paths

## Testing Patterns

### Unit Testing

```typescript
describe('Account Takeover Pattern', () => {
  let cepEngine: CEPEngine;

  beforeEach(() => {
    cepEngine = new CEPEngine();
    cepEngine.registerPattern(accountTakeoverPattern);
  });

  it('should match account takeover sequence', async () => {
    const events: Event[] = [
      createEvent('auth.login.failed', { userId: 'user123', attempts: 3 }),
      createEvent('auth.password.reset', { userId: 'user123' }),
      createEvent('auth.login.success', { userId: 'user123', country: 'RU' }),
    ];

    const alerts: Alert[] = [];
    cepEngine.on('alert:generated', (alert) => alerts.push(alert));

    for (const event of events) {
      await cepEngine.processEvent(event);
    }

    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
  });
});
```

### Integration Testing

```typescript
describe('Pattern Integration', () => {
  it('should process events end-to-end', async () => {
    const producer = new StreamProducer(config);
    const consumer = new StreamConsumer(config);
    const cepEngine = new CEPEngine();

    // Setup pattern
    cepEngine.registerPattern(testPattern);

    // Produce events
    await producer.send({ topic: 'test', value: JSON.stringify(event1) });
    await producer.send({ topic: 'test', value: JSON.stringify(event2) });

    // Consume and process
    await consumer.start(async (record) => {
      const event = JSON.parse(record.value.toString());
      await cepEngine.processEvent(event);
    });

    // Verify pattern matched
    // ...
  });
});
```

## Pattern Library

Common patterns are available in the pattern library:

- Authentication & Access Control
- Network Security
- Data Loss Prevention
- Insider Threat
- Application Performance
- Infrastructure Monitoring
- Business Metrics

See `/patterns` directory for complete library.
