# Counterintelligence Operations Platform - Guide

## Overview

The Counterintelligence Operations Platform provides comprehensive capabilities for detecting, analyzing, and countering espionage, insider threats, foreign intelligence operations, and adversarial activities targeting organizational assets and personnel.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Capabilities](#core-capabilities)
3. [Getting Started](#getting-started)
4. [API Reference](#api-reference)
5. [Best Practices](#best-practices)
6. [Security Considerations](#security-considerations)

## Architecture

The platform consists of multiple specialized packages and services:

### Packages

- **@intelgraph/insider-threat**: Behavioral anomaly detection and privileged access monitoring
- **@intelgraph/espionage-detection**: Surveillance and social engineering detection
- **@intelgraph/foreign-influence**: Influence operations and disinformation tracking
- **@intelgraph/counterespionage**: Investigation management and double agent operations
- **@intelgraph/personnel-security**: Clearance adjudication and background investigations
- **@intelgraph/technical-ci**: TSCM operations and technical security

### Services

- **counterintel-service**: Centralized counterintelligence operations API
- **threat-detection-service**: Real-time threat detection and analytics

## Core Capabilities

### 1. Insider Threat Detection

Detect and analyze potential insider threats through:

- **Behavioral Anomaly Detection**: ML-powered analysis of user behavior patterns
- **Privileged Access Monitoring**: Real-time monitoring of administrative and privileged actions
- **Data Exfiltration Detection**: Identification of unauthorized data movement
- **Policy Violation Tracking**: Automated compliance monitoring

#### Example Usage

```typescript
import { BehavioralAnomalyDetector } from '@intelgraph/insider-threat';

const detector = new BehavioralAnomalyDetector({
  sensitivityLevel: 'HIGH',
  minimumConfidence: 0.75,
  lookbackPeriodDays: 90,
  enableMLModels: true,
  alertThreshold: 50
});

// Detect anomalies in user activity
const anomalies = await detector.detectAnomalies(userId, activityData);

// Process alerts
anomalies.forEach(anomaly => {
  if (anomaly.severity === 'CRITICAL') {
    // Trigger immediate investigation
    console.log(`CRITICAL ALERT: ${anomaly.description}`);
  }
});
```

### 2. Espionage and Intelligence Collection Detection

Identify foreign intelligence activities through:

- **Technical Surveillance Detection**: RF spectrum monitoring and device identification
- **Physical Surveillance Detection**: Pattern recognition and counter-surveillance
- **Social Engineering Detection**: Elicitation and recruitment attempt identification
- **Covert Communication Analysis**: Detection of dead drops and encrypted channels

#### Example Usage

```typescript
import { SurveillanceDetector, SocialEngineeringDetector } from '@intelgraph/espionage-detection';

const surveillanceDetector = new SurveillanceDetector();
const seDetector = new SocialEngineeringDetector();

// Detect physical surveillance
const surveillance = await surveillanceDetector.detectPhysicalSurveillance(
  targetId,
  observationData
);

// Analyze communications for elicitation
const elicitation = await seDetector.analyzeForElicitation(
  targetId,
  communication
);
```

### 3. Foreign Influence Operations

Track and counter foreign influence through:

- **Influence Campaign Detection**: Identification of coordinated influence operations
- **Disinformation Tracking**: False narrative and propaganda monitoring
- **Agent of Influence Identification**: Detection of covert agents
- **Front Organization Monitoring**: Tracking of shell and front companies

#### Example Usage

```typescript
import { InfluenceCampaignDetector, DisinformationTracker } from '@intelgraph/foreign-influence';

const campaignDetector = new InfluenceCampaignDetector();
const disinfoTracker = new DisinformationTracker();

// Detect influence campaigns
const campaign = await campaignDetector.detectCampaign(data);

// Track disinformation
const incident = await disinfoTracker.trackDisinformation(content);
```

### 4. Counterespionage Investigations

Manage counterespionage operations:

- **Case Management**: Comprehensive investigation workflow tracking
- **Evidence Collection**: Chain of custody and evidence management
- **Double Agent Management**: Handler-agent relationship tracking
- **Deception Operations**: Controlled information feeds and misdirection

#### Example Usage

```typescript
import { CounterspyCaseManager, DoubleAgentHandler } from '@intelgraph/counterespionage';

const caseManager = new CounterspyCaseManager();
const agentHandler = new DoubleAgentHandler();

// Create counterespionage case
const newCase = caseManager.createCase({
  caseNumber: 'CE-2025-001',
  classification: 'SECRET',
  caseType: 'ESPIONAGE',
  openedDate: new Date(),
  status: 'ACTIVE',
  subjects: [...],
  investigators: [...],
  evidence: [],
  surveillanceOps: [],
  legalAuthorizations: [],
  prosecutionReady: false
});

// Register double agent
const agent = agentHandler.registerAgent({
  codename: 'PHOENIX',
  realIdentity: 'John Doe',
  recruitedDate: new Date(),
  handler: 'Agent Smith',
  foreignService: 'Unknown',
  foreignHandler: 'Contact Alpha',
  motivationType: 'PATRIOTIC',
  communicationMethods: ['encrypted_email'],
  reportingSchedule: 'Weekly',
  informationFed: [],
  riskLevel: 'MEDIUM',
  status: 'ACTIVE'
});
```

### 5. Personnel Security

Manage security clearances and personnel:

- **Background Investigation Management**: Tracking of investigation status
- **Security Clearance Adjudication**: Automated and manual clearance decisions
- **Foreign Contact Reporting**: Disclosure and analysis of foreign relationships
- **Continuous Evaluation**: Ongoing monitoring of cleared personnel

#### Example Usage

```typescript
import { ClearanceAdjudicationManager, ForeignContactManager } from '@intelgraph/personnel-security';

const clearanceManager = new ClearanceAdjudicationManager();
const contactManager = new ForeignContactManager();

// Initiate background investigation
const investigation = clearanceManager.initiateInvestigation(
  subjectId,
  'TOP_SECRET'
);

// Submit foreign contact report
const report = contactManager.submitReport({
  reporterId: userId,
  reportDate: new Date(),
  contactDate: new Date(),
  contactName: 'Foreign Contact',
  contactNationality: 'Country',
  relationshipType: 'PROFESSIONAL',
  frequency: 'OCCASIONAL',
  natureOfContact: 'Business meeting',
  informationDiscussed: 'General topics',
  securityConcern: false,
  reviewStatus: 'PENDING'
});
```

### 6. Technical Counterintelligence

Conduct technical security operations:

- **TSCM Operations**: Technical surveillance countermeasures and sweeps
- **RF Spectrum Monitoring**: Radio frequency analysis and detection
- **TEMPEST Assessment**: Emissions security evaluation
- **Supply Chain Security**: Vendor and component risk assessment
- **Hardware Implant Detection**: Physical device inspection and analysis

#### Example Usage

```typescript
import { TSCMOperationsManager, TEMPESTAssessor, SupplyChainSecurityManager } from '@intelgraph/technical-ci';

const tscmManager = new TSCMOperationsManager();
const tempestAssessor = new TEMPESTAssessor();
const supplyChainManager = new SupplyChainSecurityManager();

// Schedule TSCM sweep
const sweep = tscmManager.scheduleSweep(
  'Conference Room A',
  new Date('2025-12-01'),
  'COMPREHENSIVE'
);

// Conduct TEMPEST assessment
const assessment = tempestAssessor.conductAssessment(
  'Facility Alpha',
  equipmentList
);

// Assess supply chain risk
const scAssessment = supplyChainManager.assessVendor(
  'Vendor XYZ',
  'Network Router'
);
```

## Getting Started

### Installation

Install required packages:

```bash
pnpm install
```

### Starting Services

Start the counterintelligence service:

```bash
cd services/counterintel-service
pnpm dev
```

Start the threat detection service:

```bash
cd services/threat-detection-service
pnpm dev
```

### API Endpoints

#### Counterintel Service (Port 3010)

- `GET /health` - Service health check
- `POST /api/insider-threat/detect` - Detect behavioral anomalies
- `POST /api/insider-threat/monitor-access` - Monitor privileged access
- `POST /api/espionage/detect-surveillance` - Detect surveillance
- `POST /api/espionage/analyze-elicitation` - Analyze elicitation attempts
- `POST /api/influence/detect-campaign` - Detect influence campaigns
- `POST /api/counterspy/case` - Create counterespionage case
- `POST /api/personnel/investigation` - Initiate background investigation
- `POST /api/technical/tscm/sweep` - Schedule TSCM sweep

#### Threat Detection Service (Port 3011)

- `GET /health` - Service health check
- `POST /api/detect/realtime` - Real-time threat detection
- `POST /api/detect/batch` - Batch threat analysis
- `GET /api/analytics/summary` - Threat analytics summary
- `GET /api/analytics/trends` - Threat trends analysis
- `GET /api/alerts/recent` - Recent alerts
- WebSocket endpoint for real-time alert streaming

## Best Practices

### Insider Threat Detection

1. **Establish Baselines**: Allow 30-90 days for behavioral baseline establishment
2. **Tune Sensitivity**: Adjust detection thresholds based on organizational risk tolerance
3. **Review Regularly**: Conduct weekly reviews of alerts and adjust parameters
4. **Integrate Data Sources**: Combine multiple data sources for comprehensive analysis

### Espionage Detection

1. **Layered Defense**: Implement multiple detection mechanisms
2. **Training**: Ensure personnel are trained to recognize elicitation attempts
3. **Reporting Culture**: Foster an environment where suspicious activities are reported
4. **Regular Assessments**: Conduct periodic TSCM sweeps and security assessments

### Personnel Security

1. **Continuous Evaluation**: Enable continuous monitoring for all cleared personnel
2. **Timely Reporting**: Enforce strict deadlines for foreign contact reporting
3. **Regular Reinvestigations**: Maintain schedule for periodic reinvestigations
4. **Education**: Provide ongoing security awareness training

### Technical Counterintelligence

1. **Regular Sweeps**: Schedule routine TSCM operations
2. **Supply Chain Vigilance**: Carefully vet all vendors and components
3. **Physical Security**: Maintain strict physical access controls
4. **TEMPEST Compliance**: Ensure emissions security for classified systems

## Security Considerations

### Data Classification

All counterintelligence data should be classified appropriately:

- **TOP SECRET**: Critical intelligence operations, double agent identities
- **SECRET**: Active investigations, TSCM findings, clearance adjudications
- **CONFIDENTIAL**: Personnel security files, investigation reports
- **UNCLASSIFIED**: General security policies, training materials

### Access Control

Implement role-based access control:

- **Counterintelligence Officers**: Full access to all systems
- **Security Managers**: Access to personnel and clearance systems
- **Technical Security Officers**: Access to TSCM and technical systems
- **Analysts**: Read-only access to relevant data

### Audit Logging

Maintain comprehensive audit logs:

- All access to sensitive data
- All modifications to cases and investigations
- All alert acknowledgments and dispositions
- All system configuration changes

### Encryption

Encrypt all sensitive data:

- Data at rest: AES-256 encryption
- Data in transit: TLS 1.3
- Communication channels: End-to-end encryption for sensitive communications

## Support and Resources

- **Documentation**: See `/docs/counterintel/` for detailed guides
- **API Reference**: OpenAPI specifications available in each service
- **Training Materials**: Contact your security officer for training resources
- **Incident Reporting**: Use established incident reporting procedures

## Version History

- **v1.0.0** (2025-11-20): Initial release
  - Insider threat detection
  - Espionage detection
  - Foreign influence tracking
  - Counterespionage operations
  - Personnel security management
  - Technical counterintelligence

## License

Restricted - For authorized personnel only. Unauthorized access, use, or disclosure is prohibited.
