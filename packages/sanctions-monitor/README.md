# Sanctions Monitor

Comprehensive international sanctions monitoring and compliance tracking system for real-time sanctions intelligence and regulatory compliance.

## Features

- **Multi-Regime Monitoring**: Track sanctions from UN, US (OFAC, State, Commerce), EU, UK, and other jurisdictions
- **Real-time Updates**: Monitor sanctions designations, amendments, and delistings in real-time
- **Entity Screening**: Advanced name screening with fuzzy matching and identifier verification
- **Compliance Checking**: Automated compliance checks with configurable risk thresholds
- **Risk Assessment**: Comprehensive risk analysis including direct exposure, indirect relationships, and ownership structures
- **Violation Detection**: Automated detection of potential sanctions violations
- **Alert System**: Configurable alerts for new designations, matches, and compliance breaches
- **Reporting**: Generate detailed compliance reports with statistics and recommendations

## Installation

```bash
pnpm add @intelgraph/sanctions-monitor
```

## Usage

### Basic Monitoring

```typescript
import {
  SanctionsMonitor,
  SanctionRegime,
  SanctionType,
  EntityType,
  ComplianceRiskLevel
} from '@intelgraph/sanctions-monitor';

// Configure monitoring
const monitor = new SanctionsMonitor({
  regimes: [
    SanctionRegime.US_OFAC,
    SanctionRegime.UN,
    SanctionRegime.EU,
    SanctionRegime.UK_HMT
  ],
  jurisdictions: ['US', 'GB', 'EU'],
  sanctionTypes: [
    SanctionType.ASSET_FREEZE,
    SanctionType.TRADE_EMBARGO,
    SanctionType.FINANCIAL_SANCTIONS
  ],
  entityTypes: [
    EntityType.INDIVIDUAL,
    EntityType.COMPANY,
    EntityType.GOVERNMENT
  ],
  enableAutoScreening: true,
  screeningFrequency: 300000, // 5 minutes
  fuzzyMatchThreshold: 0.85,
  monitorUpdates: true,
  updateInterval: 300000, // 5 minutes
  enableAlerts: true,
  alertThresholds: {
    riskLevel: ComplianceRiskLevel.HIGH,
    matchConfidence: 0.9
  },
  requireApprovalFor: [
    ComplianceRiskLevel.HIGH,
    ComplianceRiskLevel.CRITICAL,
    ComplianceRiskLevel.PROHIBITED
  ],
  autoBlockTransactions: true,
  reportingEnabled: true
});

// Listen for new designations
monitor.on('designation-added', (designation) => {
  console.log(`New sanction: ${designation.name}`);
  console.log(`Regime: ${designation.regime}`);
  console.log(`Types: ${designation.sanctionTypes.join(', ')}`);
});

// Listen for sanctions updates
monitor.on('sanction-update', (update) => {
  console.log(`Sanction updated: ${update.designationId}`);
  console.log(`Update type: ${update.updateType}`);
});

// Listen for alerts
monitor.on('alert', (alert) => {
  console.log(`ALERT [${alert.severity}]: ${alert.title}`);
  console.log(alert.message);
});

// Start monitoring
await monitor.start();
```

### Entity Screening

```typescript
// Screen an entity by name
const screeningResult = await monitor.screenEntity(
  'ABC Corporation Ltd',
  [
    {
      type: 'TAX_ID',
      value: '12-3456789',
      country: 'US'
    },
    {
      type: 'LEI',
      value: '5493001KJTIIGC8Y1R12',
      country: 'US'
    }
  ],
  'FULL_SCREENING'
);

console.log('Screening Results:');
console.log(`Overall Risk: ${screeningResult.overallRisk}`);
console.log(`Matches Found: ${screeningResult.matches.length}`);
console.log(`Transaction Blocked: ${screeningResult.blockedTransaction}`);
console.log(`Requires Review: ${screeningResult.requiresReview}`);

// Review matches
for (const match of screeningResult.matches) {
  console.log(`\nMatch:`);
  console.log(`  Name: ${match.sanctionDetails.name}`);
  console.log(`  Regime: ${match.sanctionDetails.regime}`);
  console.log(`  Match Type: ${match.matchType}`);
  console.log(`  Confidence: ${(match.confidence * 100).toFixed(1)}%`);
  console.log(`  Risk: ${match.risk}`);
  console.log(`  Sanction Types: ${match.sanctionDetails.sanctionTypes.join(', ')}`);
}
```

### Compliance Analysis

```typescript
import { ComplianceAnalyzer } from '@intelgraph/sanctions-monitor';

// Configure analyzer
const analyzer = new ComplianceAnalyzer({
  highRiskThreshold: 60,
  criticalRiskThreshold: 80,
  highRiskCountries: ['KP', 'IR', 'SY', 'CU'],
  sanctionedCountries: ['KP', 'IR'],
  regulatedSectors: ['FINANCIAL', 'DEFENSE', 'ENERGY'],
  highRiskSectors: ['ARMS', 'NUCLEAR', 'CRYPTOCURRENCY'],
  minOwnershipTransparency: 70,
  maxOwnershipTiers: 3,
  analyzeIndirectExposure: true,
  maxIndirectExposureLevels: 2,
  analyzeOwnershipStructure: true
});

// Perform risk assessment
const designation = monitor.getDesignation('sanction-id-123');
const riskAssessment = await analyzer.assessRisk(
  'entity-001',
  'Risky Corp Inc',
  designation,
  screeningResult.matches
);

console.log('\nRisk Assessment:');
console.log(`Overall Risk: ${riskAssessment.overallRisk}`);
console.log(`Risk Score: ${riskAssessment.riskScore.toFixed(1)}/100`);

console.log('\nRisk Factors:');
for (const factor of riskAssessment.riskFactors) {
  console.log(`  ${factor.category}: ${factor.description}`);
  console.log(`    Score: ${factor.score.toFixed(1)} (Weight: ${factor.weight})`);
}

console.log('\nGeographic Risk:');
console.log(`  Countries: ${riskAssessment.geographicRisk.countries.join(', ')}`);
console.log(`  High-Risk: ${riskAssessment.geographicRisk.highRiskCountries.join(', ')}`);
console.log(`  Risk Score: ${riskAssessment.geographicRisk.riskScore.toFixed(1)}`);

console.log('\nRecommendations:');
riskAssessment.recommendations.forEach((rec, i) => {
  console.log(`  ${i + 1}. ${rec}`);
});

console.log('\nMitigation Measures:');
riskAssessment.mitigationMeasures.forEach((measure, i) => {
  console.log(`  ${i + 1}. ${measure}`);
});

console.log(`\nResidual Risk: ${riskAssessment.residualRisk}`);
```

### Analyze Compliance Check

```typescript
// Analyze screening results
const analysis = await analyzer.analyzeComplianceCheck(screeningResult);

console.log('\nCompliance Analysis:');
console.log(`Risk Level: ${analysis.riskLevel}`);
console.log(`False Positive Probability: ${(analysis.falsePositiveProbability * 100).toFixed(1)}%`);
console.log(`Recommended Action: ${analysis.recommendedAction}`);
console.log(`Justification: ${analysis.justification}`);
```

### Violation Detection

```typescript
// Detect potential violation
const violation = await analyzer.detectViolation(
  'customer-123',
  designation,
  {
    amount: {
      value: 250000,
      currency: 'USD'
    },
    transactionType: 'WIRE_TRANSFER',
    date: new Date(),
    reference: 'TXN-2024-001',
    description: 'Payment for goods',
    parties: {
      sender: 'ABC Corp',
      recipient: 'Sanctioned Entity XYZ',
      intermediaries: ['Bank A', 'Bank B']
    }
  },
  'Attempted transaction with sanctioned entity detected'
);

console.log('\nViolation Detected:');
console.log(`ID: ${violation.id}`);
console.log(`Type: ${violation.violationType}`);
console.log(`Severity: ${violation.severity}`);
console.log(`Status: ${violation.status}`);
console.log(`Description: ${violation.description}`);

// Update violation status
const updated = analyzer.updateViolation(violation.id, {
  status: 'INVESTIGATING',
  reportedToAuthorities: true,
  reportDate: new Date()
});
```

### Searching and Filtering

```typescript
// Search for entities by name
const searchResults = await monitor.searchEntity('putin', 'NAME');
console.log(`Found ${searchResults.length} matches`);

// Filter designations
const activeEUSanctions = monitor.getDesignations({
  regimes: [SanctionRegime.EU],
  active: true,
  sanctionTypes: [SanctionType.ASSET_FREEZE],
  dateRange: {
    start: new Date('2023-01-01'),
    end: new Date()
  }
});

console.log(`Active EU asset freezes: ${activeEUSanctions.length}`);

// Search by country
const russianSanctions = monitor.getDesignations({
  country: ['RU'],
  active: true
});

console.log(`Active Russian sanctions: ${russianSanctions.length}`);
```

### Statistics and Metrics

```typescript
// Get monitoring statistics
const stats = monitor.getStats();

console.log('\nMonitoring Statistics:');
console.log(`Total Designations: ${stats.totalDesignations}`);
console.log(`Active Designations: ${stats.activeDesignations}`);
console.log(`Active Monitors: ${stats.activeMonitors}`);
console.log(`Recent Updates: ${stats.recentUpdates}`);

console.log('\nDesignations by Regime:');
Object.entries(stats.designationsByRegime).forEach(([regime, count]) => {
  console.log(`  ${regime}: ${count}`);
});

console.log('\nDesignations by Type:');
Object.entries(stats.designationsByType).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// Get compliance metrics
const metrics = monitor.getMetrics();

console.log('\nCompliance Metrics:');
console.log(`Total Screenings: ${metrics.totalScreenings}`);
console.log(`Match Rate: ${(metrics.matchRate * 100).toFixed(1)}%`);
console.log(`False Positive Rate: ${(metrics.falsePositiveRate * 100).toFixed(1)}%`);
console.log(`Compliance Score: ${metrics.complianceScore}/100`);
console.log(`High Risk Entities: ${metrics.highRiskEntities}`);
console.log(`Critical Risk Entities: ${metrics.criticalRiskEntities}`);
```

### Generate Compliance Report

```typescript
// Generate periodic compliance report
const report = analyzer.generateReport(
  {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  },
  'PERIODIC'
);

console.log('\nCompliance Report:');
console.log(`Period: ${report.period.start.toDateString()} - ${report.period.end.toDateString()}`);
console.log(`Overall Status: ${report.overallStatus}`);
console.log(`Total Screenings: ${report.totalScreenings}`);
console.log(`Matches: ${report.matches}`);
console.log(`False Positives: ${report.falsePositives}`);
console.log(`Violations: ${report.violations}`);
console.log(`Unresolved Violations: ${report.unresolvedViolations}`);

console.log('\nRisk Distribution:');
Object.entries(report.riskDistribution).forEach(([level, count]) => {
  console.log(`  ${level}: ${count}`);
});

console.log('\nTop Risks:');
report.topRisks.forEach((risk, i) => {
  console.log(`  ${i + 1}. ${risk.entity} - ${risk.riskLevel} (Exposure: ${risk.exposure})`);
  console.log(`     ${risk.reason}`);
});

console.log('\nFindings:');
report.findings.forEach((finding, i) => {
  console.log(`  ${i + 1}. ${finding}`);
});

console.log('\nRecommendations:');
report.recommendations.forEach((rec, i) => {
  console.log(`  ${i + 1}. ${rec}`);
});
```

### Processing Sanctions Updates

```typescript
// Track new designation
await monitor.trackDesignation({
  id: 'sanction-2024-001',
  regime: SanctionRegime.US_OFAC,
  sanctionTypes: [
    SanctionType.ASSET_FREEZE,
    SanctionType.FINANCIAL_SANCTIONS
  ],
  entityType: EntityType.COMPANY,
  name: 'Example Sanctioned Corp',
  aliases: ['ESC', 'Example Corp'],
  identifiers: [
    {
      type: 'TAX_ID',
      value: '98-7654321',
      country: 'RU'
    }
  ],
  addresses: [
    {
      street: '123 Main St',
      city: 'Moscow',
      country: 'RU',
      type: 'BUSINESS',
      current: true
    }
  ],
  designationDate: new Date('2024-01-15'),
  effectiveDate: new Date('2024-01-15'),
  listingReason: 'Supporting military activities',
  legalBasis: 'Executive Order 14024',
  active: true,
  updated: false,
  lastUpdated: new Date(),
  relatedEntities: [],
  nationality: ['RU'],
  metadata: {}
});

// Process sanction update
await monitor.processUpdate({
  id: 'update-001',
  updateType: 'AMENDMENT',
  regime: SanctionRegime.US_OFAC,
  designationId: 'sanction-2024-001',
  timestamp: new Date(),
  changes: [
    {
      field: 'aliases',
      oldValue: ['ESC', 'Example Corp'],
      newValue: ['ESC', 'Example Corp', 'EC International'],
      description: 'Added new alias'
    }
  ],
  reason: 'Additional alias identified',
  officialReference: 'OFAC-2024-0123'
});
```

### Event Handling

```typescript
// Listen for screening completed
monitor.on('screening-completed', (check) => {
  console.log(`Screening completed for: ${check.entityName}`);
});

// Listen for match detected
monitor.on('match-detected', (check) => {
  console.log(`MATCH DETECTED: ${check.entityName}`);
  console.log(`Risk: ${check.overallRisk}`);

  if (check.blockedTransaction) {
    console.log('TRANSACTION BLOCKED');
    // Notify relevant parties
  }
});

// Listen for designation updates
monitor.on('designation-updated', (designation) => {
  console.log(`Designation updated: ${designation.name}`);
  // Rescreen affected parties
});

// Listen for update checks
monitor.on('update-check', (info) => {
  console.log(`Checking for updates at ${info.timestamp}`);
});
```

## API Reference

### SanctionsMonitor

Main monitoring class for tracking sanctions and screening entities.

#### Constructor

```typescript
new SanctionsMonitor(config: MonitoringConfig)
```

#### Methods

- `start()` - Start monitoring sanctions
- `stop()` - Stop monitoring
- `trackDesignation(designation)` - Track a new sanction designation
- `processUpdate(update)` - Process a sanction update
- `screenEntity(name, identifiers?, checkType?)` - Screen an entity against sanctions lists
- `getDesignations(filter?)` - Get designations with optional filtering
- `getDesignation(id)` - Get specific designation by ID
- `searchEntity(query, searchType?)` - Search for entity by name or identifier
- `getStats()` - Get monitoring statistics
- `getMetrics()` - Get compliance metrics
- `clearDesignations()` - Clear all tracked designations
- `queueScreening(check)` - Add screening to queue

#### Events

- `started` - Monitoring started
- `stopped` - Monitoring stopped
- `designation-added` - New designation tracked
- `designation-updated` - Designation updated
- `sanction-update` - Sanction update processed
- `screening-completed` - Entity screening completed
- `match-detected` - Sanctions match detected
- `alert` - Alert generated
- `update-check` - Update check performed
- `designations-cleared` - Designations cleared

### ComplianceAnalyzer

Analyzes sanctions exposure and compliance risks.

#### Constructor

```typescript
new ComplianceAnalyzer(config: AnalysisConfig)
```

#### Methods

- `assessRisk(entityId, entityName, designation?, matches?)` - Perform comprehensive risk assessment
- `analyzeExposure(entityId, relationships)` - Analyze exposure to sanctioned entities
- `detectViolation(entityId, designation, transactionDetails?, description?)` - Detect potential violations
- `analyzeComplianceCheck(check)` - Analyze compliance check results
- `generateReport(period, reportType?)` - Generate compliance report
- `getRiskAssessment(entityId)` - Get risk assessment for entity
- `getViolation(violationId)` - Get specific violation
- `getViolations(filter?)` - Get all violations with optional filtering
- `updateViolation(violationId, updates)` - Update violation status
- `clearData()` - Clear all analysis data

## Types

### Sanction Regimes

- `UN` - United Nations
- `UN_SECURITY_COUNCIL` - UN Security Council
- `EU` - European Union
- `US_OFAC` - US Office of Foreign Assets Control
- `US_STATE` - US State Department
- `US_COMMERCE` - US Commerce Department
- `UK_FCDO` - UK Foreign, Commonwealth & Development Office
- `UK_HMT` - UK Her Majesty's Treasury
- `CANADA`, `AUSTRALIA`, `JAPAN`, `SWITZERLAND`
- `BILATERAL` - Bilateral sanctions
- `OTHER` - Other regimes

### Sanction Types

- `ASSET_FREEZE` - Asset freeze/blocking
- `TRADE_EMBARGO` - Trade embargo
- `IMPORT_BAN` / `EXPORT_BAN` - Trade restrictions
- `ARMS_EMBARGO` - Arms embargo
- `TRAVEL_BAN` / `VISA_RESTRICTION` - Travel restrictions
- `FINANCIAL_SANCTIONS` - Financial restrictions
- `SECTORAL_SANCTIONS` - Sector-specific sanctions
- And more...

### Entity Types

- `INDIVIDUAL` - Individual person
- `COMPANY` - Company/corporation
- `ORGANIZATION` - Organization
- `GOVERNMENT` - Government entity
- `FINANCIAL_INSTITUTION` - Financial institution
- `VESSEL` - Ship/vessel
- `AIRCRAFT` - Aircraft

### Compliance Risk Levels

- `LOW` - Low risk, standard monitoring
- `MEDIUM` - Medium risk, enhanced due diligence
- `HIGH` - High risk, requires approval
- `CRITICAL` - Critical risk, senior management approval
- `PROHIBITED` - Prohibited, must block

## Configuration

### MonitoringConfig

```typescript
interface MonitoringConfig {
  regimes: SanctionRegime[];           // Regimes to monitor
  jurisdictions: string[];              // Jurisdictions to track
  sanctionTypes: SanctionType[];        // Sanction types to track
  entityTypes: EntityType[];            // Entity types to track
  enableAutoScreening: boolean;         // Enable automatic screening
  screeningFrequency: number;           // Screening frequency (ms)
  fuzzyMatchThreshold: number;          // Fuzzy match threshold (0-1)
  monitorUpdates: boolean;              // Monitor for updates
  updateInterval: number;               // Update check interval (ms)
  enableAlerts: boolean;                // Enable alert generation
  alertThresholds: {
    riskLevel: ComplianceRiskLevel;     // Alert risk threshold
    matchConfidence: number;            // Alert confidence threshold
  };
  requireApprovalFor: ComplianceRiskLevel[];  // Risk levels requiring approval
  autoBlockTransactions: boolean;       // Auto-block high-risk transactions
  reportingEnabled: boolean;            // Enable reporting
}
```

### AnalysisConfig

```typescript
interface AnalysisConfig {
  highRiskThreshold: number;            // High risk threshold (0-100)
  criticalRiskThreshold: number;        // Critical risk threshold (0-100)
  highRiskCountries: string[];          // High-risk country codes
  sanctionedCountries: string[];        // Sanctioned country codes
  regulatedSectors: string[];           // Regulated sectors
  highRiskSectors: string[];            // High-risk sectors
  minOwnershipTransparency: number;     // Min ownership transparency (0-100)
  maxOwnershipTiers: number;            // Max ownership tiers
  analyzeIndirectExposure: boolean;     // Analyze indirect exposure
  maxIndirectExposureLevels: number;    // Max indirect exposure levels
  analyzeOwnershipStructure: boolean;   // Analyze ownership structure
}
```

## Best Practices

1. **Regular Updates**: Keep sanctions lists updated by monitoring official sources
2. **Threshold Tuning**: Adjust fuzzy match thresholds based on false positive rates
3. **Risk-Based Approach**: Configure different workflows based on risk levels
4. **Documentation**: Maintain detailed records of all screening decisions
5. **Training**: Ensure staff understand sanctions requirements and procedures
6. **Audit Trail**: Keep complete audit trail of all compliance activities
7. **Escalation**: Define clear escalation procedures for high-risk matches
8. **Review Process**: Implement manual review for medium and high-risk cases
9. **Testing**: Regularly test screening system with known sanctioned entities
10. **Reporting**: Generate regular compliance reports for management and regulators

## Compliance Notes

This package provides tools for sanctions compliance but does not constitute legal advice. Organizations should:

- Consult with legal counsel regarding sanctions obligations
- Implement comprehensive compliance programs
- Stay informed of regulatory changes
- Maintain appropriate policies and procedures
- Conduct regular audits and reviews
- Report violations to appropriate authorities
- Maintain records as required by law

## License

MIT
