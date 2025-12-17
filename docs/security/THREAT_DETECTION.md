# Advanced Threat Detection and Anomaly Detection System

## Overview

The IntelGraph Advanced Threat Detection System is an enterprise-grade security platform that combines behavioral analytics, machine learning, and threat intelligence to detect and respond to sophisticated cyber threats in real-time.

## Table of Contents

- [Architecture](#architecture)
- [Core Capabilities](#core-capabilities)
- [Components](#components)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Threat Hunting](#threat-hunting)
- [Playbooks](#playbooks)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Architecture

### System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Data Collection Layer                         │
├──────────────────────────────────────────────────────────────────┤
│  Network Events │ Application Logs │ System Events │ User Actions │
└────────┬─────────────────────┬──────────────────┬────────────────┘
         │                     │                  │
         v                     v                  v
┌──────────────────────────────────────────────────────────────────┐
│                    Detection Engine Layer                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐│
│  │   Behavioral    │  │   ML-Powered     │  │    Network      ││
│  │   Analytics     │  │   Anomaly        │  │    Threat       ││
│  │   (UBA/EBA)     │  │   Detection      │  │   Detection     ││
│  └─────────────────┘  └──────────────────┘  └─────────────────┘│
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐│
│  │   MITRE ATT&CK  │  │   Data Poisoning │  │      APT        ││
│  │   TTP Detector  │  │    Detection     │  │   Detection     ││
│  └─────────────────┘  └──────────────────┘  └─────────────────┘│
└────────┬──────────────────────────────────────────────────────────┘
         │
         v
┌──────────────────────────────────────────────────────────────────┐
│                   Correlation & Enrichment                        │
├──────────────────────────────────────────────────────────────────┤
│  Event Correlation │ Threat Intel Enrichment │ Context Addition  │
└────────┬─────────────────────────────────────────────────────────┘
         │
         v
┌──────────────────────────────────────────────────────────────────┐
│                  Alerting & Response Layer                        │
├──────────────────────────────────────────────────────────────────┤
│  Multi-channel Alerts │ SOAR Integration │ Auto Response │ Hunting│
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Collection**: Events collected from multiple sources (network, application, system)
2. **Detection**: Multiple detection engines analyze events in parallel
3. **Correlation**: Related events are grouped and correlated
4. **Enrichment**: Events enriched with threat intelligence and context
5. **Alerting**: Alerts generated and sent through configured channels
6. **Response**: Automated or manual response actions executed
7. **Storage**: Events and alerts stored in TimescaleDB for analysis

## Core Capabilities

### 1. Behavioral Anomaly Detection

**User Behavior Analytics (UBA)**:
- Baseline behavior profiling for each user
- Statistical anomaly detection (z-score, IQR, MAD)
- Temporal pattern analysis (time of day, day of week)
- Geographic location tracking
- Device fingerprinting
- Access pattern analysis

**Entity Behavior Analytics (EBA)**:
- System behavior profiling
- Application behavior monitoring
- Resource usage anomaly detection
- API usage pattern analysis

**Adaptive Thresholds**:
- Automatic threshold adjustment based on historical data
- Seasonal pattern recognition
- Trend analysis and forecasting

### 2. Machine Learning Threat Models

**Supervised Learning**:
- Multi-class threat classifier
- Deep neural network architecture
- Support for imbalanced datasets with class weights
- Feature importance analysis
- Gradient-based explainability

**Unsupervised Learning**:
- Isolation Forest for novel threat discovery
- Autoencoder for anomaly detection
- Reconstruction error-based scoring
- No labeled data required

**Semi-Supervised Learning**:
- Online learning with limited labels
- Continuous model adaptation
- Sliding window approach

**Ensemble Methods**:
- Model voting and averaging
- Weighted ensemble
- Robust detection with multiple models

**Online Learning**:
- Real-time model updates
- Adaptive to evolving threats
- No full retraining required

**Explainable AI**:
- LIME/SHAP integration
- Feature contribution analysis
- Human-readable threat reasoning

### 3. Network Threat Detection

**DDoS Detection**:
- Request rate monitoring
- Distributed attack detection
- Volumetric analysis
- Protocol-specific detection

**Port Scanning**:
- Horizontal and vertical scan detection
- Threshold-based detection
- MITRE ATT&CK T1046 mapping

**Lateral Movement**:
- Internal network traversal detection
- Unusual authentication patterns
- Privilege escalation attempts

**C2 Communication**:
- Beaconing pattern detection
- Regular interval analysis
- Domain generation algorithm (DGA) detection
- DNS tunneling detection

**Data Exfiltration**:
- Volume-based detection
- Unusual destination analysis
- Protocol anomaly detection
- TLS/SSL inspection

### 4. MITRE ATT&CK TTP Detection

**Tactic Mapping**:
- 14 MITRE ATT&CK tactics supported
- Automatic technique identification
- Kill chain analysis
- Campaign tracking

**Technique Coverage**:
- 200+ techniques tracked
- Sub-technique granularity
- Confidence scoring
- False positive reduction

**Detection Logic**:
- Signature-based detection
- Behavioral pattern matching
- Statistical analysis
- ML-based classification

### 5. Advanced Persistent Threat (APT) Detection

**Long-term Tracking**:
- Dwell time analysis
- Multi-stage attack correlation
- Persistence mechanism detection
- Stealth technique identification

**Low-and-Slow Detection**:
- Extended timeline analysis
- Subtle behavior changes
- Correlation across weeks/months

**Attribution**:
- Threat actor profiling
- TTP correlation
- Campaign identification
- Confidence-based attribution

### 6. Threat Intelligence Integration

**Supported Formats**:
- STIX/TAXII 2.x
- MISP
- Custom feeds
- Commercial intelligence (Recorded Future, CrowdStrike, etc.)

**IOC Types**:
- IP addresses
- Domains
- URLs
- File hashes (MD5, SHA1, SHA256, SHA512)
- Email addresses
- CVE identifiers

**Enrichment**:
- Geolocation
- ASN information
- Reputation scoring
- WHOIS data
- Passive DNS

### 7. Real-time Alerting

**Channels**:
- Email (SMTP)
- SMS (Twilio, etc.)
- Slack
- PagerDuty
- Microsoft Teams
- Webhooks
- SIEM integration

**Alert Features**:
- Priority scoring
- Deduplication
- Correlation grouping
- Automatic enrichment
- False positive suppression
- Escalation policies

### 8. SOAR Integration

**Supported Platforms**:
- Splunk Phantom
- Palo Alto Cortex XSOAR
- IBM Resilient
- Demisto
- Custom integrations

**Response Playbooks**:
- Automated investigation
- Containment actions
- Evidence collection
- Remediation workflows

### 9. Threat Hunting

**Hunt Types**:
- Hypothesis-driven hunting
- Indicator-based hunting
- TTP-based hunting
- Anomaly-driven hunting
- Intelligence-driven hunting

**Features**:
- Custom query builder
- Historical data analysis
- Automated playbooks
- Finding tracking
- Collaboration tools

### 10. Visualization

**Dashboards**:
- Real-time threat overview
- Kill chain visualization
- Attack timeline
- Network graph
- Geospatial mapping
- Heatmaps

## Components

### Packages

1. **@intelgraph/threat-detection-core**
   - Core types and interfaces
   - Threat event models
   - Alert definitions
   - ML model types
   - Threat intelligence types
   - Hunting types

2. **@intelgraph/anomaly-detection**
   - Statistical anomaly detectors
   - Behavioral analyzers (UBA/EBA)
   - Time-series detectors
   - Isolation Forest implementation

3. **@intelgraph/ml-models**
   - ML client for threat detection service
   - Model integration
   - Prediction interfaces

4. **@intelgraph/network-threat-detection**
   - Network event analysis
   - DDoS detection
   - Port scan detection
   - C2 beaconing detection
   - Data exfiltration detection

### ML Models (Python)

Located in `ml/threat_models/`:

1. **AnomalyAutoencoder**
   - Deep autoencoder for anomaly detection
   - Reconstruction error-based scoring
   - GPU acceleration support

2. **ThreatClassifier**
   - Multi-class threat classification
   - Deep neural network
   - Class imbalance handling

3. **EnsembleDetector**
   - Combines multiple models
   - Voting and averaging
   - Weighted aggregation

4. **OnlineThreatLearner**
   - Continuous learning
   - Sliding window approach
   - No full retraining required

### Database Schema

TimescaleDB schema (`db/schemas/threat-detection-schema.sql`):

- **security_events**: Time-series event data (90-day retention)
- **security_alerts**: Alert management (1-year retention)
- **behavior_profiles**: User/entity behavior baselines
- **threat_intel_indicators**: IOC database
- **threat_hunts**: Hunt tracking and results

### Continuous Aggregates

- **security_events_hourly**: Hourly event summary
- **security_alerts_daily**: Daily alert statistics

## Deployment

### Prerequisites

```bash
# Node.js packages
pnpm install

# Python dependencies
cd ml/threat_models
pip install -r requirements.txt

# Database setup
psql -U postgres -f db/schemas/threat-detection-schema.sql
```

### Configuration

See [Configuration](#configuration) section below.

### Running Services

```bash
# Start ML service
cd ml
uvicorn main:app --host 0.0.0.0 --port 8000

# Start Node.js services
pnpm run start:threat-detection

# Start monitoring
docker-compose -f monitoring/docker-compose.yml up -d
```

## Configuration

### Environment Variables

```bash
# Database
TIMESCALE_HOST=localhost
TIMESCALE_PORT=5433
TIMESCALE_DB=threats
TIMESCALE_USER=threat_user
TIMESCALE_PASSWORD=<password>

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<password>

# ML Service
ML_SERVICE_URL=http://localhost:8000
ML_API_KEY=<api_key>

# Alerting
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alerts@example.com
SMTP_PASSWORD=<password>

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_API_KEY=<api_key>

# Threat Intelligence
THREAT_INTEL_FEEDS=feed1,feed2,feed3
RECORDED_FUTURE_API_KEY=<api_key>
```

### Detector Configuration

```typescript
import { BehaviorAnalyzer } from '@intelgraph/anomaly-detection';

const behaviorAnalyzer = new BehaviorAnalyzer({
  redis: {
    host: 'localhost',
    port: 6379
  },
  learningPeriodDays: 7,
  minSamplesForBaseline: 100,
  adaptiveThresholds: true,
  contextualAnalysis: true
});
```

## Usage

### Basic Threat Detection

```typescript
import { NetworkThreatDetector } from '@intelgraph/network-threat-detection';
import { BehaviorAnalyzer } from '@intelgraph/anomaly-detection';

// Initialize detectors
const networkDetector = new NetworkThreatDetector({
  ddosRequestThreshold: 1000,
  ddosSourceThreshold: 100,
  ddosTimeWindow: 60000,
  portScanPortsThreshold: 20,
  portScanTimeWindow: 300000,
  exfiltrationBytesThreshold: 100 * 1024 * 1024,
  exfiltrationTimeWindow: 300000,
  beaconingMinRequests: 10,
  beaconingIntervalTolerance: 5000
});

// Analyze network event
const networkEvent = {
  timestamp: new Date(),
  sourceIp: '192.168.1.100',
  destinationIp: '10.0.0.1',
  sourcePort: 45123,
  destinationPort: 80,
  protocol: 'TCP',
  bytesTransferred: 1024,
  packetsCount: 10
};

const threat = await networkDetector.analyzeNetworkEvent(networkEvent);

if (threat) {
  console.log(`Threat detected: ${threat.description}`);
  console.log(`Severity: ${threat.severity}`);
  console.log(`Score: ${threat.threatScore}`);
}
```

### Behavioral Analysis

```typescript
// Analyze user behavior
const userId = 'user123';
const behaviorEvent = {
  timestamp: new Date(),
  entityType: 'user',
  requestRate: 50,
  bytesTransferred: 5242880,
  endpoint: '/api/users',
  geoLocation: 'US-CA',
  userAgent: 'Mozilla/5.0...'
};

const anomalyScore = await behaviorAnalyzer.analyzeBehavior(
  userId,
  behaviorEvent
);

if (anomalyScore.score > 0.7) {
  console.log(`Behavioral anomaly detected: ${anomalyScore.explanation}`);
}
```

### ML-based Detection

```typescript
import { MLThreatClient } from '@intelgraph/ml-models';

const mlClient = new MLThreatClient({
  endpoint: 'http://localhost:8000',
  apiKey: process.env.ML_API_KEY
});

// Detect anomaly using autoencoder
const features = {
  requestRate: 100,
  dataTransfer: 10485760,
  sessionDuration: 3600,
  errorRate: 0.05
};

const result = await mlClient.detectAnomaly(features);

if (result.isAnomaly) {
  console.log(`ML Anomaly Score: ${result.score}`);
  console.log(result.explanation);
}
```

## API Reference

### REST API Endpoints

```
POST /api/v1/threats/analyze       - Analyze event for threats
POST /api/v1/threats/batch         - Batch threat analysis
GET  /api/v1/threats/events        - Query threat events
GET  /api/v1/threats/events/:id    - Get specific event

POST /api/v1/alerts                - Create alert
GET  /api/v1/alerts                - List alerts
GET  /api/v1/alerts/:id            - Get alert details
PATCH /api/v1/alerts/:id           - Update alert status

POST /api/v1/hunts                 - Create threat hunt
GET  /api/v1/hunts                 - List hunts
POST /api/v1/hunts/:id/query       - Execute hunt query
POST /api/v1/hunts/:id/findings    - Record finding

GET  /api/v1/intel/indicators      - Query threat indicators
POST /api/v1/intel/enrich          - Enrich indicator
GET  /api/v1/intel/feeds           - List threat feeds

GET  /api/v1/models                - List ML models
GET  /api/v1/models/:id/health     - Check model health
POST /api/v1/models/:id/predict    - Get prediction
```

## Threat Hunting

### Creating a Hunt

```typescript
import { ThreatHunt, HuntType } from '@intelgraph/threat-detection-core';

const hunt: ThreatHunt = {
  id: uuidv4(),
  name: 'Suspicious PowerShell Activity',
  description: 'Hunt for encoded PowerShell commands',
  type: HuntType.TTP_BASED,
  hypothesis: 'Adversaries using obfuscated PowerShell for execution',
  targetScope: {
    systems: ['windows-servers'],
    timeRange: {
      start: new Date(Date.now() - 7 * 24 * 3600 * 1000),
      end: new Date()
    }
  },
  ttps: [
    {
      tactic: 'execution',
      technique: 'T1059.001',
      detectionLogic: {
        processName: 'powershell.exe',
        commandLine: /\-[eE]nc(odedCommand)?/
      }
    }
  ],
  status: 'PLANNING',
  hunters: ['analyst1@company.com'],
  leadHunter: 'analyst1@company.com',
  findings: [],
  queries: [],
  totalEventsAnalyzed: 0,
  suspiciousEventsFound: 0,
  threatsConfirmed: 0,
  metrics: {},
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date()
};
```

## Playbooks

### Incident Response Playbook

```yaml
playbook:
  name: "DDoS Response"
  trigger:
    category: DDOS
    severity: [CRITICAL, HIGH]

  steps:
    - name: "Verify Attack"
      action: analyze_traffic
      params:
        window: 5m
        threshold: 1000

    - name: "Identify Attack Vectors"
      action: correlate_events
      params:
        group_by: source_ip

    - name: "Block Malicious IPs"
      action: firewall_block
      params:
        ips: "{{ attack_sources }}"
        duration: 1h

    - name: "Enable DDoS Mitigation"
      action: enable_ddos_protection
      params:
        level: aggressive

    - name: "Notify SOC"
      action: send_alert
      params:
        channels: [slack, pagerduty]
        priority: critical

    - name: "Document Incident"
      action: create_incident
      params:
        type: ddos
        severity: "{{ severity }}"
```

## Monitoring

### Metrics

Available Prometheus metrics:

- `security_events_total` - Total security events by category/severity
- `security_alerts_total` - Total alerts generated
- `anomaly_detections_total` - Anomaly detections by type
- `ml_model_accuracy` - ML model accuracy
- `ml_model_drift_score` - Model drift indicator
- `ml_inference_duration_seconds` - ML inference latency
- `threat_intel_ioc_matches_total` - IOC match count
- `alert_response_time_seconds` - Alert response time
- `automated_response_total` - Automated responses executed
- `threat_intel_feed_status` - Feed health status

### Grafana Dashboards

Pre-built dashboards available in `monitoring/grafana/dashboards/`:

1. **Threat Detection Overview**
   - Real-time threat level
   - Active threats by severity
   - Threat timeline
   - Critical alerts

2. **Network Security**
   - DDoS indicators
   - Port scan activity
   - C2 beaconing
   - Data exfiltration

3. **ML Model Performance**
   - Model accuracy
   - Drift detection
   - Inference performance
   - Prediction volume

4. **Behavioral Analytics**
   - UBA/EBA anomalies
   - Profile statistics
   - Baseline drift

5. **Threat Intelligence**
   - Feed status
   - IOC matches
   - Enrichment coverage

## Troubleshooting

### High False Positive Rate

1. Adjust detection thresholds
2. Extend learning period for behavioral analytics
3. Fine-tune ML model with labeled data
4. Review and update threat intelligence feeds
5. Implement alert suppression rules

### Low Detection Coverage

1. Verify all data sources are connected
2. Check detector configurations
3. Review ML model performance
4. Ensure threat intelligence feeds are up-to-date
5. Validate network traffic visibility

### Performance Issues

1. Scale horizontally (add more detection nodes)
2. Optimize database queries
3. Implement caching for frequent lookups
4. Use batch processing for high-volume events
5. Enable GPU acceleration for ML models

### ML Model Drift

1. Retrain models with recent data
2. Update feature engineering
3. Review data quality
4. Check for concept drift
5. Implement online learning

## Best Practices

1. **Start with Learning Mode**: Run detectors in learning mode for 7-14 days
2. **Tune Thresholds**: Adjust based on your environment and risk tolerance
3. **Regular Model Updates**: Retrain ML models monthly or when drift detected
4. **Threat Intel Hygiene**: Keep feeds updated and remove stale indicators
5. **Alert Triage**: Implement escalation policies and on-call rotations
6. **Hunt Regularly**: Schedule weekly threat hunting activities
7. **Document Everything**: Maintain runbooks and incident documentation
8. **Test Playbooks**: Regularly test automated response playbooks
9. **Monitor Performance**: Track metrics and optimize bottlenecks
10. **Continuous Improvement**: Review and enhance detection rules

## Support

For issues, questions, or contributions:
- Internal documentation: Confluence
- Bug reports: JIRA Security Board
- Questions: #security-ops Slack channel

---

**Version**: 1.0.0
**Last Updated**: 2024
**Maintained by**: Security Operations Team
