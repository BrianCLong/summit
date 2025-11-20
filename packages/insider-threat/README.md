# Insider Threat Detection Package

Comprehensive insider threat detection and behavioral anomaly analysis system.

## Features

- **Behavioral Anomaly Detection**: ML-powered detection of unusual user behavior
- **Privileged Access Monitoring**: Real-time monitoring of privileged access events
- **Data Exfiltration Detection**: Identification of data theft attempts
- **Policy Violation Tracking**: Automated policy compliance monitoring
- **Financial Stress Indicators**: Risk assessment based on financial factors
- **Foreign Contact Reporting**: Management of foreign relationship disclosures
- **Travel Pattern Analysis**: Analysis of travel for security concerns
- **Workplace Behavior Monitoring**: Detection of concerning behavioral changes
- **Loyalty Assessments**: Comprehensive reliability evaluations

## Usage

```typescript
import { BehavioralAnomalyDetector, PrivilegedAccessMonitor } from '@intelgraph/insider-threat';

// Initialize anomaly detector
const detector = new BehavioralAnomalyDetector({
  sensitivityLevel: 'HIGH',
  minimumConfidence: 0.75,
  lookbackPeriodDays: 90,
  enableMLModels: true,
  alertThreshold: 50
});

// Monitor privileged access
const monitor = new PrivilegedAccessMonitor();
const alerts = await monitor.monitorAccess(accessEvent);
```
